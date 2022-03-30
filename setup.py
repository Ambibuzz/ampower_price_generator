from setuptools import setup, find_packages

with open("requirements.txt") as f:
	install_requires = f.read().strip().split("\n")

# get version from __version__ variable in ampower/__init__.py
from ampower import __version__ as version

setup(
	name="ampower",
	version=version,
	description="Powered by Ambibuzz",
	author="n ithead@ambibuzz.com",
	author_email="ithead@ambibuzz.com",
	packages=find_packages(),
	zip_safe=False,
	include_package_data=True,
	install_requires=install_requires
)
