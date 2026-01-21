-- Initialize Database Schema for Industry Sentiment

-- Dimension table for metrics
CREATE TABLE IF NOT EXISTS dim_metrics (
    metric_id SERIAL PRIMARY KEY,
    industry VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_code VARCHAR(100) NOT NULL,
    source VARCHAR(50) DEFAULT 'AkShare',
    frequency VARCHAR(20), -- Daily, Monthly, Quarterly
    unit VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(industry, metric_code)
);

-- Fact table for raw data
CREATE TABLE IF NOT EXISTS fact_raw_data (
    id BIGSERIAL PRIMARY KEY,
    metric_id INTEGER REFERENCES dim_metrics(metric_id),
    data_date DATE NOT NULL,
    value NUMERIC(20, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_id, data_date)
);

-- Fact table for processed factors (e.g., Year-on-Year growth, Z-score)
CREATE TABLE IF NOT EXISTS fact_processed_factors (
    id BIGSERIAL PRIMARY KEY,
    metric_id INTEGER REFERENCES dim_metrics(metric_id),
    data_date DATE NOT NULL,
    factor_value NUMERIC(20, 4),
    factor_type VARCHAR(50), -- yoy, mom, normalized, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_id, data_date, factor_type)
);

-- Fact table for industry sentiment scores
CREATE TABLE IF NOT EXISTS fact_industry_sentiment (
    id BIGSERIAL PRIMARY KEY,
    industry VARCHAR(50) NOT NULL,
    data_date DATE NOT NULL,
    sentiment_score NUMERIC(10, 4),
    details JSONB, -- Store weights or component scores
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(industry, data_date)
);

-- Seed metadata for the four industries
INSERT INTO dim_metrics (industry, metric_name, metric_code, frequency, unit, description) VALUES
-- 白酒 (Liquor): Using CSI Liquor Index as a proxy for industry sentiment
('白酒', '中证白酒指数', '399997', 'Daily', 'Points', '中证白酒指数反映白酒行业上市公司的整体表现'),
('白酒', '茅台批发价', 'moutai_price', 'Weekly', 'CNY', '飞天茅台散瓶批发价(模拟/自定义接口)'),

-- 新能源车 (NEV): Monthly Sales
('新能源车', '新能源汽车销量', 'nev_sales', 'Monthly', 'Units', '中国新能源汽车月度销量数据'),
('新能源车', '动力电池产量', 'battery_output', 'Monthly', 'GWh', '动力电池月度产量数据'),

-- 半导体 (Semiconductor): Industry Index or Trade Data
('半导体', '中华半导体芯片指数', '990001', 'Daily', 'Points', '反映半导体芯片行业整体走势'),
('半导体', '集成电路进口金额', 'ic_import_value', 'Monthly', 'USD', '中国集成电路月度进口总额'),

-- 机器人 (Robot): PMI or Production
('机器人', '制造业PMI', 'mfg_pmi', 'Monthly', 'Index', '国家统计局制造业采购经理指数'),
('机器人', '工业机器人产量', 'industrial_robot_output', 'Monthly', 'Sets', '工业机器人月度累计产量')
ON CONFLICT (industry, metric_code) DO NOTHING;
