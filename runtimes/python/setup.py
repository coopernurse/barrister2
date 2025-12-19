"""Setup configuration for barrister Python runtime"""

from setuptools import setup, find_packages

setup(
    name="barrister2",
    version="0.1.0",
    description="Barrister Python Runtime Library",
    author="Barrister",
    packages=find_packages(),
    python_requires=">=3.7",
    classifiers=[
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
)

