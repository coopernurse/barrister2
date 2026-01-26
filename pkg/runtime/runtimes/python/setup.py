"""Setup configuration for pulserpc Python runtime"""

from setuptools import setup, find_packages

setup(
    name="pulserpc",
    version="0.1.0",
    description="PulseRPC Python Runtime Library",
    author="PulseRPC",
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

