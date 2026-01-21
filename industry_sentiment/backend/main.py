import sys
import os
import logging
from datetime import datetime

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from collector import DataCollector, DatabaseClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("EntryScript")

def main():
    logger.info("Starting Daily Industry Sentiment Data Collection...")

    collector = DataCollector()
    db = DatabaseClient()

    # Define mapping of metrics (in reality, fetch these from dim_metrics)
    # metric_id : fetch_function
    tasks = [
        {"metric_id": 1, "name": "中证白酒指数", "func": collector.fetch_liquor_data},
        {"metric_id": 5, "name": "中证半导体指数", "func": collector.fetch_semiconductor_index},
    ]

    for task in tasks:
        try:
            logger.info(f"Processing task: {task['name']}")
            df = task['func']()
            if not df.empty:
                # Take the latest row for today's data (or latest available)
                latest_data = df.iloc[-1]
                data_date = latest_data['date'].date()
                value = float(latest_data['value'])

                db.save_raw_data(task['metric_id'], data_date, value)
                logger.info(f"Successfully collected {task['name']} for {data_date}")
            else:
                logger.warning(f"No data returned for {task['name']}")
        except Exception as e:
            logger.error(f"Failed to process {task['name']}: {str(e)}")

    # Add logic for monthly data if needed (check if it's the right day of month)
    # logger.info("Checking for monthly updates (NEV, Robot)...")
    # ...

    logger.info("Data collection finished.")

if __name__ == "__main__":
    main()
