# CalcyteJS DEPRECATED - DO NOT USE

THIS CODE IS DEPRECATED - DO NOT USE

This WAS a work-in-progress port of the python-based [Calcyte tool](https://codeine.research.uts.edu.au/eresearch/calcyte).

## Status

This is Beta code.

## About

Calcyte is a toolkit to implement the [DataCrate] specification:


1.  Generating HTML from DataCrate CATALOG.json files.
2.  Managing metadata for collections of content via automatically generated
    spreadsheets, to create CATALOG.json files
3.  Packaging data in BagIt format, and optionally zipping it.

Calcyte targets the [Draft DataCrate Packaging format v0.3](https://github.com/UTS-eResearch/datacrate/blob/master/spec/0.3/data_crate_specification_v0.3.md).

## Installation

- Install [node.js](https://nodejs.org/en/)

- Install the [BagIt](https://github.com/LibraryOfCongress/bagit-java)
  `brew install bagit`

- Install Siegfreid using the [instructions](https://github.com/richardlehane/siegfried/wiki/Getting-started).

- Get the code:
  git clone https://code.research.uts.edu.au/eresearch/CalcyteJS.git

- Link the binary for development use:

  npm link

## Usage / instructions

Usage:

```
> ./calcyfy

Usage: calcyfy [options] <directories...>

  Generates DataCrate HTML for CATALOG.JSON files. Pass a list of directories. To create Spreadsheet files for entring metadata use -d or -r.


  Options:

    -V, --version         output the version number
    -b,  --bag [bag-dir]  Create Bagit Bag(s) under [bag-dir])
    -n,  --no             No Citation - only applies ith --bag
    -z,  --zip            Create a zipped version of the bag - only applies with --bag
    -d,  --depth          Maximum depth to recurse into directories
    -r,  --recurse        Recurse into directories - up to 10
    -u, --url [distro]    Distribution URL
    -h, --help            output usage information

```

To run Calcyte on a group of directories pass it a list of directories

To generate an HTML file for a CATALOG.json file in ./dir

```
calcyfy dir
```

One directory:

```
calcyfy test_data/Glop_Pot -r
```

This will:
- Traverse the entire Glop_Pot directory, and generate or update CATALOG_name.xlsx files.
- Create or update the `test_data/Glop_Pot/CATALOG.json` file
- Create a *DataCrate Website* with entry-point `test_data/Glop_Pot/CATALOG.html`

All the sample directories:

```
calcyfy -r test_data/*
```

Calcyte will generate:

- a CATALOG\_$dir.xlsx file in each directory (this is for humans to fill in with
  metadata about the data)

- An index.html file summarizing the data using metadata from CATALOG\_$dir.xlsx

- A CATALOG.json file containing JSON-LD metadata derived from the CATALOG\* files plus some basic file-format information.

See the examples in `test_data`.

TODO: Instructions for filling in the CATALOG files.

[datacrate]: https://github.com/UTS-eResearch/datacrate
