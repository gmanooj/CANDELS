# 📄 Location: d:/Ptojects/TeamBridge/cli/setup.py
from setuptools import setup, find_packages
import os

this_directory = os.path.abspath(os.path.dirname(__file__))
readme_path = os.path.join(this_directory, "README.md")

long_description = ""
if os.path.exists(readme_path):
    with open(readme_path, "r", encoding="utf-8") as fh:
        long_description = fh.read()

setup(
    name="teambridge-candles",
    version="1.1.0",  # 🚀 Major release reflecting the full flat architecture expansion
    packages=find_packages(),
    long_description=long_description,
    long_description_content_type="text/markdown",
    install_requires=[
        "requests>=2.31.0",
        "click>=8.1.0",
        "watchdog>=3.0.0",
        "python-socketio[client]>=5.11.0",
        "inquirer>=3.1.3",
        "halo>=0.0.31"  
    ],
    entry_points={
        'console_scripts': [
            'candles=candles.main:cli',
            'cn=candles.main:cli',
        ],
    },
)