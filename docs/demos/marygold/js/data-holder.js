define(["underscore", "utils"], function (_, utils) {
    class DataHolder {
        constructor(dataJSON) {
            this.data = dataJSON;
        }

        /**
         * Returns the number of connected components in the graph, including
         * those that were skipped during layout.
         *
         * @returns {Number}
         */
        numComponents() {
            return this.data.components.length;
        }

        /**
         * Returns the number of nodes in the graph.
         *
         * This doesn't draw a distinction between "positive" and "negative"
         * nodes -- so for graphs where the negative nodes are implied (e.g.
         * Velvet) the caller may want to divide these counts by 2.
         *
         * Note: currently excludes nodes in non-laid-out components. Oops.
         *
         * ... And this includes duplicate nodes (e.g. those created to
         * separate adjacent bubble patterns).
         *
         * @returns {Number}
         */
        totalNumNodes() {
            return this.data.total_num_nodes;
        }

        /**
         * Returns the number of edges in the graph.
         *
         * As with totalNumNodes(), this includes "implied" edges, doesn't
         * span non-laid-out components, and includes "duplicate"
         * edges (non-real edges that connect a node with its duplicate).
         *
         * @returns {Number}
         */
        totalNumEdges() {
            return this.data.total_num_edges;
        }

        /**
         * Returns the filetype of the graph provided to the python script.
         *
         * @returns {String}
         */
        fileType() {
            return this.data.input_file_type;
        }

        /**
         * Returns the file name of the graph provided to the python script.
         *
         * This is just the "base name" of the file, so it doesn't have
         * directory information included -- e.g. if the file path provided to
         * the python script was /home/marcus/graphs/my_cool_graph.gfa, then
         * this should just be "my_cool_graph.gfa".
         *
         * @returns {String}
         */
        fileName() {
            return this.data.input_file_basename;
        }

        /**
         * Returns the (1-indexed) number of the first component that we were
         * able to lay out.
         *
         * The purpose of this is so that if, for example, component 1 was too
         * large to draw, we can start at component 2.
         *
         * Notes:
         *  1. There isn't a guarantee that only the first few components are
         *  not drawable (since components are sorted by nodes first, you can
         *  imagine the case where a later component has a small enough amnt of
         *  nodes but way too many edges). The purpose of this function is just
         *  to give the user a good default component to start with.
         *
         *  2. We raise an error in the python side of things if all components
         *  are too large, so at least one of the components must have been
         *  laid out already.
         *
         * @returns {Number}
         *
         * @throws {Error} If the python script messed up and all of the
         *                 components are marked as skipped. Yikes!
         */
        smallestViewableComponent() {
            for (var i = 0; i < this.data.components.length; i++) {
                if (!this.data.components[i].skipped) {
                    return i + 1;
                }
            }
            throw new Error(
                "No components were laid out -- python script broken."
            );
        }

        /**
         * Returns the size rank of the component containing a node with a
         * given name. We stop after finding a match -- so this will break if
         * multiple nodes share a name (this should never happen in practice).
         *
         * If no component contains a node with the given name, this returns
         * -1 (so the caller can throw an error / alert the user).
         *
         * This is currently case sensitive. I guess we could change that in
         * the future if people request it (although then we would run into the
         * problem of ambiguity in search results, unless we enforce that node
         * names must be unique ignoring case).
         *
         * @param {String} queryName
         *
         * @returns {Number} cmpRank (1-indexed, so the largest component is 1,
         *                           etc.)
         */
        findComponentContainingNodeName(queryName) {
            var nodeNamePos = this.data.node_attrs.name;
            // Part 1: run the  search (_.findIndex() and _.some() should both
            // use short circuiting, so potentially these won't involve
            // searching every node in the graph)
            var matchingCmpIdx = _.findIndex(this.data.components, function (
                cmp
            ) {
                if (!cmp.skipped) {
                    // Return true if any of the values in cmp.nodes (the
                    // values in this Object are Arrays of node data) has the
                    // "name" property that matches the query name
                    return _.some(cmp.nodes, function (nodeData) {
                        return nodeData[nodeNamePos] === queryName;
                    });
                }
                return false;
            });
            // Part 2: figure out if the search failed or succeeded
            if (matchingCmpIdx === -1) {
                // No components contained this node name. Sometimes it be like
                // that. Just return -1 so it's clear that the search failed.
                // (We could also simplify this by just returning
                // matchingCmpIdx + 1 regardless of the outcome, since it's not
                // like 0 is being used, but that strikes me as messy and prone
                // to errors.
                return -1;
            } else {
                // The search succeeded! One of the components contains this
                // node. Component size ranks are 1-indexed, so increment the
                // index of the component we found by 1.
                return matchingCmpIdx + 1;
            }
        }

        /**
         * Returns an Array with all component size ranks that were laid out.
         *
         * Size ranks given in the array are 1-indexed.
         *
         * @returns {Array}
         */
        getAllLaidOutComponentRanks() {
            var laidOutRanks = [];
            for (var i = 0; i < this.data.components.length; i++) {
                if (!this.data.components[i].skipped) {
                    laidOutRanks.push(i + 1);
                }
            }
            return laidOutRanks;
        }

        /**
         * Throws an error if a component size rank is invalid.
         *
         * This is not designed to be used for user-facing validation -- this
         * is an internal method, meant to catch errors that I accidentally
         * make.
         *
         * @param {Number} sizeRank
         *
         * @returns {Boolean} true if the size rank is valid. This shouldn't be
         *                    relied on, though; this function should probably
         *                    just be called without caring about the return
         *                    value.
         *
         * @throws {Error} If sizeRank is not a positive integer in the range
         *                 [1, this.data.components.length]
         *
         */
        validateComponentRank(sizeRank) {
            if (sizeRank > 0 && Number.isInteger(sizeRank)) {
                if (sizeRank <= this.data.components.length) {
                    return true;
                } else {
                    throw new Error(
                        "Size rank of " +
                            sizeRank +
                            " is too large: only " +
                            this.data.components.length +
                            " components in the graph"
                    );
                }
            } else {
                throw new Error(
                    "Size rank of " + sizeRank + " isn't a positive integer"
                );
            }
        }

        /**
         * Returns an Array of Arrays with data for all patterns in a given
         * component.
         *
         * Previously this was just an Object (similarly to how nodes are
         * stored), but it turns out that we have to care about pattern drawing
         * order, so we now store this in an Array. (See
         * AssemblyGraph.to_dict() in the Python code for details; tldr,
         * gotta draw parent patterns before child patterns.)
         *
         * @returns {Array}
         */
        getPatternsInComponent(sizeRank) {
            this.validateComponentRank(sizeRank);
            return this.data.components[sizeRank - 1].patts;
        }

        /**
         * Returns an Object with data for all nodes in a given component.
         *
         * @returns {Array}
         */
        getNodesInComponent(sizeRank) {
            this.validateComponentRank(sizeRank);
            return this.data.components[sizeRank - 1].nodes;
        }

        /**
         * Returns an Object with data for all edges in a given component.
         *
         * @returns {Array}
         */
        getEdgesInComponent(sizeRank) {
            this.validateComponentRank(sizeRank);
            return this.data.components[sizeRank - 1].edges;
        }

        getPattAttrs() {
            return this.data.patt_attrs;
        }

        getNodeAttrs() {
            return this.data.node_attrs;
        }

        getEdgeAttrs() {
            return this.data.edge_attrs;
        }

        getExtraNodeAttrs() {
            return this.data.extra_node_attrs;
        }

        getExtraEdgeAttrs() {
            return this.data.extra_edge_attrs;
        }

        getComponentBoundingBox(sizeRank) {
            this.validateComponentRank(sizeRank);
            return this.data.components[sizeRank - 1].bb;
        }

        getNodeInfo(nodeID) {
            // NOTE: unlike in getPatternInfo(), node IDs are sorta stored as
            // strings in the data JSON -- even though they're integers,
            // they're used as the keys of Objects, which means that the JSON
            // conversion automatically treats them as strings.
            // So we don't need to worry about converting btwn strings/numbers:
            // the data assumes these are strings, and Cytoscape.js assumes
            // these are strings.
            var nodeAttrs = this.getNodeAttrs();
            for (var i = 0; i < this.data.components.length; i++) {
                var cmp = this.data.components[i];
                if (!cmp.skipped) {
                    if (_.has(cmp.nodes, nodeID)) {
                        return cmp.nodes[nodeID];
                    }
                }
            }
            throw new Error("Node " + nodeID + " not found in data.");
        }

        getNodeName(nodeID) {
            for (var i = 0; i < this.data.components.length; i++) {
                var cmp = this.data.components[i];
                if (!cmp.skipped) {
                    if (_.has(cmp.nodes, nodeID)) {
                        return cmp.nodes[nodeID][this.getNodeAttrs().name];
                    }
                }
            }
            throw new Error("Node " + nodeID + " not found in data.");
        }

        getEdgeInfo(srcID, tgtID) {
            var edgeAttrs = this.getEdgeAttrs();
            for (var i = 0; i < this.data.components.length; i++) {
                var cmp = this.data.components[i];
                if (!cmp.skipped) {
                    if (_.has(cmp.edges, srcID)) {
                        if (_.has(cmp.edges[srcID], tgtID)) {
                            return cmp.edges[srcID][tgtID];
                        } else {
                            // Well, the source node is in this component, but
                            // it doesn't seem to have an edge to the target
                            // node. something is seriously wrong.
                            throw new Error(
                                "Found source node " +
                                    srcID +
                                    " but couldn't " +
                                    "find an edge from it to the target node " +
                                    tgtID +
                                    "."
                            );
                        }
                    }
                }
            }
            throw new Error(
                "Edge from " + srcID + " to " + tgtID + " not found in data."
            );
        }

        getPatternInfo(pattID) {
            var pattAttrs = this.getPattAttrs();
            // Cytoscape.js stores IDs as Strings, even though we store
            // pattern IDs as integers. We get around this by just
            // converting the ID Cytoscape.js gives us to an integer, which
            // should be safe since (for patterns, at least) we're the
            // ones who come up with these IDs.
            var intID;
            if (utils.isValidInteger(pattID)) {
                intID = parseInt(pattID);
            } else {
                throw new Error(
                    "Pattern ID " + pattID + " is not a nonnegative integer."
                );
            }
            for (var i = 0; i < this.data.components.length; i++) {
                var cmp = this.data.components[i];
                if (!cmp.skipped) {
                    for (var p = 0; p < cmp.patts.length; p++) {
                        if (cmp.patts[p][pattAttrs.pattern_id] === intID) {
                            return cmp.patts[p];
                        }
                    }
                }
            }
            throw new Error("Pattern " + pattID + " not found in data.");
        }
    }
    return { DataHolder: DataHolder };
});
