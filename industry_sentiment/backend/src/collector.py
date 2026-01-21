import akshare as ak
import pandas as pd
import logging
import time
from datetime import datetime
from functools import wraps

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def retry(exceptions, tries=3, delay=2, backoff=2):
    """
    Retry decorator with exponential backoff.
    """
    def deco_retry(f):
        @wraps(f)
        def f_retry(*args, **kwargs):
            mtries, mdelay = tries, delay
            while mtries > 1:
                try:
                    return f(*args, **kwargs)
                except exceptions as e:
                    logger.warning(f"{e}, Retrying in {mdelay} seconds...")
                    time.sleep(mdelay)
                    mtries -= 1
                    mdelay *= backoff
            return f(*args, **kwargs)
        return f_retry
    return deco_retry

class DataCollector:
    """
    Base class for data collection.
    """
    def __init__(self):
        pass

    @retry(Exception, tries=3)
    def fetch_liquor_data(self):
        """
        Fetch Liquor industry index (CSI Liquor Index).
        """
        logger.info("Fetching Liquor industry data...")
        # 中证白酒指数 (399997)
        df = ak.stock_zh_index_daily_em(symbol="sz399997")
        df['date'] = pd.to_datetime(df['date'])
        return df[['date', 'close']].rename(columns={'close': 'value'})

    @retry(Exception, tries=3)
    def fetch_nev_sales(self):
        """
        Fetch NEV sales data.
        """
        logger.info("Fetching NEV sales data...")
        # 宏观经济数据 - 汽车销量
        # 使用 ak.macro_china_passenger_car_info() 或者类似接口
        # 注意：AkShare 接口可能会变动，这里选择一个稳定的
        try:
            df = ak.macro_china_passenger_car_info()
            # 这里需要根据实际返回结构处理
            return df
        except:
            # 备选：中国汽车工业协会数据或新能源汽车销量
            # 这里模拟返回一个结构，实际开发中需对接具体 AkShare 接口
            logger.warning("Target NEV interface failed, using fallback or placeholder.")
            return pd.DataFrame()

    @retry(Exception, tries=3)
    def fetch_semiconductor_index(self):
        """
        Fetch Semiconductor industry index.
        """
        logger.info("Fetching Semiconductor index data...")
        # 中华半导体芯片 (990001) or 国证芯片 (159995 is ETF, 980017 is index)
        df = ak.stock_zh_index_daily_em(symbol="sz399987") # 中证酒改为中证全指半导体
        df['date'] = pd.to_datetime(df['date'])
        return df[['date', 'close']].rename(columns={'close': 'value'})

    @retry(Exception, tries=3)
    def fetch_robot_pmi(self):
        """
        Fetch Manufacturing PMI.
        """
        logger.info("Fetching Manufacturing PMI...")
        df = ak.macro_china_pmi()
        # 处理日期和数值
        # df 包含 '月份', '制造业-指数' 等
        return df

class DatabaseClient:
    """
    Simple Database Client for fact_raw_data insertion.
    In a real scenario, use SQLAlchemy or psycopg2.
    """
    def __init__(self, db_config=None):
        self.db_config = db_config

    def save_raw_data(self, metric_id, data_date, value):
        """
        Save raw data to fact_raw_data table.
        """
        logger.info(f"Saving data: metric_id={metric_id}, date={data_date}, value={value}")
        if self.db_config is None:
            logger.warning("No database config provided, skipping real save.")
            return

        import psycopg2
        query = """
        INSERT INTO fact_raw_data (metric_id, data_date, value)
        VALUES (%s, %s, %s)
        ON CONFLICT (metric_id, data_date)
        DO UPDATE SET value = EXCLUDED.value, created_at = CURRENT_TIMESTAMP;
        """
        try:
            conn = psycopg2.connect(**self.db_config)
            with conn.cursor() as cur:
                cur.execute(query, (metric_id, data_date, value))
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"Database save failed: {e}")
            raise
