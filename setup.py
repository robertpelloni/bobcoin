from setuptools import setup, find_packages

setup(
    name="bobcoin",
    version="0.1.0",
    description="Privacy-focused blockchain token with social value mining",
    author="Robert Pelloni",
    packages=find_packages(),
    install_requires=[
        "cryptography>=41.0.0",
        "pycryptodome>=3.19.0",
        "ecdsa>=0.18.0",
        "base58>=2.1.1",
        "requests>=2.31.0",
        "flask>=3.0.0",
    ],
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "bobcoin=bobcoin.cli:main",
        ],
    },
)
