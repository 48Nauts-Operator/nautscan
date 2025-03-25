import os
import tarfile
import shutil
from pathlib import Path
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants
LICENSE_KEY = os.getenv('MAXMIND_LICENSE_KEY', 'YOUR_LICENSE_KEY')  # Replace with your license key
DOWNLOAD_URL = f'https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key={LICENSE_KEY}&suffix=tar.gz'
DB_PATH = Path(__file__).parent.parent / 'data' / 'GeoLite2-City.mmdb'

def download_database():
    """Download and extract the GeoIP database"""
    try:
        # Create data directory if it doesn't exist
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)

        # Download the database
        logger.info("Downloading GeoIP database...")
        response = requests.get(DOWNLOAD_URL, stream=True)
        response.raise_for_status()

        # Save the downloaded file
        temp_file = DB_PATH.parent / 'geoip.tar.gz'
        with open(temp_file, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)

        # Extract the database
        logger.info("Extracting database...")
        with tarfile.open(temp_file, 'r:gz') as tar:
            for member in tar.getmembers():
                if member.name.endswith('.mmdb'):
                    member.name = os.path.basename(member.name)
                    tar.extract(member, DB_PATH.parent)
                    extracted_path = DB_PATH.parent / member.name
                    shutil.move(extracted_path, DB_PATH)
                    break

        # Clean up
        temp_file.unlink()
        logger.info(f"Database downloaded and extracted to {DB_PATH}")

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to download database: {e}")
        raise
    except (tarfile.TarError, OSError) as e:
        logger.error(f"Failed to extract database: {e}")
        raise

if __name__ == '__main__':
    download_database() 