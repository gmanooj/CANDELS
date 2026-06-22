# 📄 Location: d:/Ptojects/TeamBridge/cli/setup.py
from setuptools import setup, find_packages

setup(
    name="teambridge-cli",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.31.0",
        "click>=8.1.0",
        "watchdog>=3.0.0",
        "python-socketio[client]>=5.11.0"
    ],
    entry_points={
        'console_scripts': [
            'teambridge=teambridge.main:cli',
            'tb=teambridge.main:cli',
            'tb-login=teambridge.main:login_script',
        ],
    },
)
