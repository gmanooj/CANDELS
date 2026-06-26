# 📄 Location: d:/Ptojects/TeamBridge/cli/setup.py
from setuptools import setup, find_packages

setup(
    name="candles",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.31.0",
        "click>=8.1.0",
        "watchdog>=3.0.0",
        "python-socketio[client]>=5.11.0",
        "inquirer>=3.1.3"  # Added for premium arrow-key and spacebar selections
    ],
    entry_points={
        'console_scripts': [
            'candles=candles.main:cli',
            'cn=candles.main:cli',
            'cn-login=candles.main:login_script',
            'cn-live=candles.main:live_script',
        ],
    },
)