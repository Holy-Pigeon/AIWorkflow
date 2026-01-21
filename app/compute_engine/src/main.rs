use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use dotenvy::dotenv;
use anyhow::Result;

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
struct Metric {
    metric_id: i32,
    industry: String,
    metric_name: String,
    metric_code: String,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
struct RawData {
    metric_id: i32,
    data_date: NaiveDate,
    value: Decimal,
}

#[derive(Debug, Serialize)]
struct ProcessedFactor {
    metric_id: i32,
    data_date: NaiveDate,
    factor_value: Decimal,
    factor_type: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    println!("Connected to database");

    // 1. Fetch metrics
    let metrics = sqlx::query_as::<_, Metric>("SELECT metric_id, industry, metric_name, metric_code FROM dim_metrics")
        .fetch_all(&pool)
        .await?;

    for metric in &metrics {
        println!("Processing industry: {}, metric: {}", metric.industry, metric.metric_name);

        // 2. Fetch raw data
        let raw_data = sqlx::query_as::<_, RawData>(
            "SELECT metric_id, data_date, value FROM fact_raw_data WHERE metric_id = $1 ORDER BY data_date ASC"
        )
        .bind(metric.metric_id)
        .fetch_all(&pool)
        .await?;

        if raw_data.is_empty() {
            continue;
        }

        // 3. Simple normalization (Z-Score or Min-Max)
        // Here we implement a simple normalization as a placeholder for the calculation engine
        let values: Vec<f64> = raw_data.iter().map(|d| d.value.to_string().parse::<f64>().unwrap_or(0.0)).collect();
        let mean = values.iter().sum::<f64>() / values.len() as f64;
        let std_dev = (values.iter().map(|v| (v - mean).powi(2)).sum::<f64>() / values.len() as f64).sqrt();

        for data in raw_data {
            let val = data.value.to_string().parse::<f64>().unwrap_or(0.0);
            let normalized_val = if std_dev != 0.0 { (val - mean) / std_dev } else { 0.0 };
            let factor_val = Decimal::from_f64_retain(normalized_val).unwrap_or(Decimal::ZERO);

            // 4. Save to fact_processed_factors
            sqlx::query(
                "INSERT INTO fact_processed_factors (metric_id, data_date, factor_value, factor_type)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (metric_id, data_date, factor_type) DO UPDATE SET factor_value = $3"
            )
            .bind(data.metric_id)
            .bind(data.data_date)
            .bind(factor_val)
            .bind("normalized")
            .execute(&pool)
            .await?;
        }
    }

    // 5. Calculate Industry Sentiment (Weighted average of factors)
    calculate_industry_sentiment(&pool).await?;

    Ok(())
}

async fn calculate_industry_sentiment(pool: &Pool<Postgres>) -> Result<()> {
    let industries = vec!["白酒", "新能源车", "半导体", "机器人"];

    for industry in industries {
        println!("Calculating sentiment for {}", industry);

        // Fetch all normalized factors for this industry grouped by date
        let rows = sqlx::query!(
            r#"
            SELECT f.data_date, AVG(f.factor_value) as avg_score,
                   jsonb_object_agg(m.metric_name, f.factor_value) as component_details
            FROM fact_processed_factors f
            JOIN dim_metrics m ON f.metric_id = m.metric_id
            WHERE m.industry = $1 AND f.factor_type = 'normalized'
            GROUP BY f.data_date
            ORDER BY f.data_date ASC
            "#,
            industry
        )
        .fetch_all(pool)
        .await?;

        for row in rows {
            let sentiment_score = row.avg_score.unwrap_or(Decimal::ZERO);

            sqlx::query(
                "INSERT INTO fact_industry_sentiment (industry, data_date, sentiment_score, details)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (industry, data_date) DO UPDATE SET sentiment_score = $3, details = $4"
            )
            .bind(industry)
            .bind(row.data_date)
            .bind(sentiment_score)
            .bind(row.component_details)
            .execute(pool)
            .await?;
        }
    }

    Ok(())
}
