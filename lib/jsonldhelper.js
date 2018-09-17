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

/* JSON-LD utility and lookup functions */

var jsonld = require("jsonld");
var defaults = require("./defaults.js")
var URI = require("uri-js")





// TODO


// Context looker-upper



module.exports = function () {
    return {
        item_by_path: this.item_by_path,
        item_by_id: this.item_by_id,
        item_by_type: this.item_by_type,

        get_uri_for_term: function (term) {
            if (this.json_ld["@context"][term]) {
                if (this.json_ld["@context"][term]["@id"]) {
                    term = this.json_ld["@context"][term]["@id"]
                }
                else if (!this.json_ld["@context"][term]["@type"]) {
                    term = this.json_ld["@context"][term]
                }
               

            }
            var url = URI.parse(term)
            // Looks like  a URL
            if (url.scheme) {
                if (!url.host) {
                    term = this.get_uri_for_term(url.scheme) + url.path
                }
                //this.context_keys_used.add(term)
                return (term)
            }
            else {
                return null
            }

        },
        trim_context: function () {
            var new_context = {}
            for (let term of this.context_keys_used) {
                var uri = this.get_uri_for_term(term)
                if (uri) new_context[term] = uri
            }
            for (let type of Object.keys(this.item_by_type)) {
                var uri = this.get_uri_for_term(type)
                if (uri) new_context[type] = uri
            }
            this.json_ld["@context"] = new_context
        },
        reference_to_item: function (node) {
            // Check if node is a reference to something else
            // If it is, return the something else
            if (node["@id"] && this.item_by_id[node["@id"]]) {
                return this.item_by_id[node["@id"]]
            }
            else {
                return null
            }
        },

        value_as_array: function (value) {
            if (!value) {
                return []
            }
            else if (!Array.isArray(value)) {
                return [value];
            } else {
                return value;
            }
        },

        push_value: function(item, key, value) {
            if (item[key])  {
                if (!Array.isArray(item[key])) {
                item[key] = [item[key]]
                }
               item[key].push(value)
            }
            else {
                item[key] = [value]
            }

        },
        init: function init(json) {
            this.json_ld = json;
            this.item_by_id = {};
            this.item_by_url = {};
            this.item_by_type = {}; // dict of arrays
            this.graph = this.json_ld["@graph"];
            this.context_keys_used = new Set()
            for (let i = 0; i < this.graph.length; i++) {
                var item = this.graph[i];
                for (let key of Object.keys(item)) { //TODO: Filter
                    this.context_keys_used.add(key)
                }
                if (item["@id"]) {
                    this.item_by_id[item["@id"]] = item;
                }
                if (item["path"]) {
                    this.item_by_url[item["path"]] = item;
                }
                if (!item["@type"]) {
                    item["@type"] = ["Thing"];
                }
                for (let t of this.value_as_array(item["@type"])) {
                    if (!this.item_by_type[t]) {
                        this.item_by_type[t] = [];
                    }
                    this.item_by_type[t].push(item);
                }
            }
            this.root_node = this.item_by_url["./"]
            ? this.item_by_url["./"]
            : this.item_by_url["data/"];
        },
        make_back_links: function (item) {
            for (let key of Object.keys(item)) {
                if (key != "@id" && key != "@reverse") {
                    for (let part of this.value_as_array(item[key])) {
                        var target = this.reference_to_item(part);
                        var back_link = defaults.back_links[key];
                        if (target && back_link) {
                            if (!target[back_link]) {
                                //console.log("Making link", key, back_link, target)
                                target[back_link] = [{ "@id": item["@id"] }];
                            }
                        } else if (
                            !back_link && target
                        ) {
                            // We are linking to something
                            //console.log("Doing a back link", key, target['name'], item['name'])
                            if (!target["@reverse"]) {
                                target["@reverse"] = {};
                            }
                            if (!target["@reverse"][key]) {
                                target["@reverse"][key] = [];
                            }

                            var got_this_reverse_already = false;
                            // for (let r of target["@reverse"][key]) {
                            //   //console.log(r, r["@id"], item["@id"])
                            //   if (r["@id"] === item["@id"]) {
                            //     got_this_reverse_already = true
                            //    }
                            // }
                            if (!got_this_reverse_already) {
                                target["@reverse"][key].push({ "@id": item["@id"] });
                            }
                            //console.log(JSON.stringify(target, null, 2))
                        }
                    }
                }
            }
        },

        add_back_links: function () {
            // Add @reverse properties if not there
            for (let item of this.json_ld["@graph"]) {
                this.make_back_links(item);
            }
        }

    }
};


