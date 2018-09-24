/* This is part of Calcyte a tool for implementing the DataCrate data packaging
spec.  Copyright (C) 2018  University of Technology Sydney

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* Defaults for Calcyte such as names of key files */

const html_multi_file_dirs = "CATALOG_files";
const catalog_root_name = "CATALOG";
const datacite_file_name = "datacite.xml";
const catalog_json_file_name = `${catalog_root_name}.json`;
const html_file_name = `${catalog_root_name}.html`;
const max_depth = "10"; // Number of dirs to recurse into
const max_files_in_dir = "100"; // Don't list files in a directory if there are more than this
const ignore_file_regex = new RegExp(
  `(^${html_multi_file_dirs[0]}$)|(^~)|(^\\.)|(${datacite_file_name})`
);
const ignore_dir_regex = new RegExp(`(^${html_multi_file_dirs}$)|(^\\.)`);
const BagIt_Profile_Identifier =
  "https://raw.githubusercontent.com/UTS-eResearch/datacrate/master/spec/0.3/profile-datacrate-v0.3.json";
const DataCrate_Specification_Identifier =
  "https://github.com/UTS-eResearch/datacrate/blob/master/spec/0.3/data_crate_specification_v0.3.md";
const DataCrate_version = "0.3";
const DataCrate_profile_file = "defaults/profile-datacrate-v" + DataCrate_version + ".json"
const default_context = "defaults/context.json"

// DataCrate specific terms which have inverses
const back_links = {
  hasFile: "fileOf",
  hasPart: "isPartOf",
  hasMember: "memberOf"
};

const back_back_links = new Set(Object.values(back_links))

module.exports = {
  html_multi_file_dirs: html_multi_file_dirs,
  default_context: default_context,
  catalog_root_name: catalog_root_name,
  datacite_file_name: datacite_file_name,
  catalog_json_file_name: catalog_json_file_name,
  html_file_name: html_file_name,
  ignore_file_regex: ignore_file_regex,
  max_depth: max_depth,
  ignore_dir_regex: ignore_dir_regex,
  max_files_in_dir: max_files_in_dir,
  BagIt_Profile_Identifier: BagIt_Profile_Identifier,
  DataCrate_Specification_Identifier: DataCrate_Specification_Identifier,
  DataCrate_version: DataCrate_version,
  back_links: back_links,
  back_back_links: back_back_links,
  DataCrate_profile_file: DataCrate_profile_file
};
