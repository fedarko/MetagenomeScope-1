define(["jquery", "underscore", "cytoscape", "utils"], function (
    $,
    _,
    cytoscape,
    utils
) {
    class Drawer {
        /**
         * Constructs a Drawer.
         *
         * This object is used for drawing elements and for interfacing
         * directly with Cytoscape.js. It also accepts a few callback functions
         * that we'll call when certain things in the graph happen, so that we
         * can update the state of the rest of the application.
         *
         * @param {String} cyDivID ID of the <div> which will contain the
         *                         Cytoscape.js display.
         *
         * @param {Function} onSelect Function to be called when an element in
         *                            the graph is selected.
         *
         * @param {Function} onUnselect Function to be called when an element
         *                              in the graph is unselected/deselected.
         *
         * @param {Function} onTogglePatternCollapse Function to be called when
         *                                           a pattern in the graph is
         *                                           right-clicked, to be
         *                                           either collapsed or
         *                                           uncollapsed.
         *
         * @param {Function} onDestroy Function to be called when the graph is
         *                             destroyed (i.e. when the user presses
         *                             the "Draw" button, and stuff is already
         *                             drawn that needs to be removed).
         */
        constructor(
            cyDivID,
            onSelect,
            onUnselect,
            onTogglePatternCollapse,
            onDestroy
        ) {
            this.cyDivID = cyDivID;
            this.cyDiv = $("#" + cyDivID);
            // Instance of Cytoscape.js
            this.cy = null;

            this.bgColor = undefined;

            this.onSelect = onSelect;
            this.onUnselect = onUnselect;
            this.onTogglePatternCollapse = onTogglePatternCollapse;
            this.onDestroy = onDestroy;

            // Some numbers indicating the number of elements currently drawn.
            // Useful for things like figuring out whether or not all patterns
            // are currently collapsed.
            this.numDrawnNodes = 0;
            this.numDrawnEdges = 0;
            this.numDrawnPatterns = 0;

            // Various constants
            //
            // Anything less than this constant will be considered a "straight"
            // control point distance. This way we can approximate simple
            // B-splines with straight bezier curves (which are cheaper and
            // easier to draw).
            this.CTRL_PT_DIST_EPSILON = 5.0;
            // Edge thickness stuff, as will be rendered by Cytoscape.js. Used
            // in tandem with the "relative_weight" (formerly "thickness")
            // value associated with each edge to scale edges' displayed
            // "weights" accordingly.
            this.MIN_EDGE_THICKNESS = 3;
            this.MAX_EDGE_THICKNESS = 10;
            this.EDGE_THICKNESS_RANGE =
                this.MAX_EDGE_THICKNESS - this.MIN_EDGE_THICKNESS;

            // Used for debugging
            this.VERBOSE = false;
        }

        /**
         * Destroys the instance of Cytoscape.js, in order to prepare for
         * drawing another part of the graph (or just the same part again I
         * guess, since that is the user's prerogative).
         */
        destroyGraph() {
            this.cy.destroy();
            this.numDrawnNodes = 0;
            this.numDrawnEdges = 0;
            this.numDrawnPatterns = 0;
            this.onDestroy();
        }

        /**
         * Creates an instance of Cytoscape.js to which we can add elements.
         *
         * Also calls setGraphBindings().
         */
        initGraph() {
            // Update the bg color only when we call initGraph(). This ensures
            // that we have the currently-used background color on hand, for
            // stuff like exporting where we need to know the background color
            this.bgColor = $("#bgcp").colorpicker("getValue");
            this.cyDiv.css("background", this.bgColor);
            this.cy = cytoscape({
                container: document.getElementById(this.cyDivID),
                layout: { name: "preset" },
                // TODO: this should be a config-level thing (should we make a
                // Config object or file or whatever?) rather than hardcoded
                // here
                maxZoom: 9,
                // TODO: hideEdgesOnViewport and textureOnViewport
                userPanningEnabled: false,
                userZoomingEnabled: false,
                boxSelectionEnabled: false,
                autounselectify: true,
                autoungrabify: true,
                style: [
                    {
                        selector: "node",
                        style: {
                            width: "data(w)",
                            height: "data(h)",
                            "z-index-compare": "manual",
                        },
                    },
                    // The following few classes are used to set properties of
                    // patterns
                    {
                        selector: "node.pattern",
                        style: {
                            shape: "rectangle",
                            "border-width": 2,
                            "border-color": "#000000",
                            "padding-top": 0,
                            "padding-right": 0,
                            "padding-left": 0,
                            "padding-bottom": 0,
                        },
                    },
                    {
                        // Give collapsed patterns a number indicating child count
                        selector: "node.pattern[?isCollapsed]",
                        style: {
                            "min-zoomed-font-size": 12,
                            "font-size": 48,
                            label: "data(collapsedLabel)",
                            "text-valign": "center",
                            "font-weight": "bold",
                            color: $("#cngcccp").colorpicker("getValue"),
                        },
                    },
                    {
                        selector: "node.F",
                        style: {
                            // default color matches 'green2' in graphviz
                            // (but honestly I just picked what I considered to be
                            // the least visually offensive shade of green)
                            "background-color": $("#fropecp").colorpicker(
                                "getValue"
                            ),
                            shape: "polygon",
                            // Defines a "sideways hourglass" pattern.
                            // This is intended to be used when the graph is
                            // displayed from left to right or right to left.
                            // If the graph is rotated, these points should
                            // also be (this distinction is made in the old
                            // codebase -- see the
                            // mgsc.FRAYED_ROPE_LEFTRIGHTDIR and _UPDOWNDIR
                            // variables).
                            //
                            // |\/|
                            // |  |
                            // |/\|
                            "shape-polygon-points":
                                "-1 -1 0 -0.5 1 -1 1 1 0 0.5 -1 1",
                        },
                    },
                    {
                        selector: "node.B",
                        style: {
                            // default color matches 'cornflowerblue' in graphviz
                            "background-color": $("#bubblecp").colorpicker(
                                "getValue"
                            ),
                            shape: "polygon",
                            // Defines a hexagon pattern. Notes about the
                            // polygon points for frayed ropes above apply.
                            //  ___
                            // /   \
                            // \___/
                            "shape-polygon-points":
                                "-1 0 -0.5 -1 0.5 -1 1 0 0.5 1 -0.5 1",
                        },
                    },
                    {
                        selector: "node.C",
                        style: {
                            // default color matches 'salmon' in graphviz
                            "background-color": $("#chaincp").colorpicker(
                                "getValue"
                            ),
                        },
                    },
                    {
                        selector: "node.Y",
                        style: {
                            // default color matches 'darkgoldenrod1' in graphviz
                            "background-color": $("#ychaincp").colorpicker(
                                "getValue"
                            ),
                            shape: "ellipse",
                        },
                    },
                    {
                        selector: "node.M",
                        style: {
                            "background-color": $("#miscpatterncp").colorpicker(
                                "getValue"
                            ),
                        },
                    },
                    {
                        selector: "node.bb_enforcing",
                        style: {
                            // Make these nodes invisible
                            "background-opacity": 0,
                            // A width/height of zero just results in Cytoscape.js not
                            // drawing these nodes -- hence a width/height of one
                            width: 1,
                            height: 1,
                        },
                    },
                    {
                        // Nodes with the "basic" class, known in old versions
                        // of MetagenomeScope as "noncluster", are just regular
                        // nodes (i.e. not collapsed patterns that behave like
                        // nodes).
                        selector: "node.basic",
                        style: {
                            label: "data(label)",
                            "text-valign": "center",
                            // rendering text is computationally expensive, so if
                            // we're zoomed out so much that the text would be
                            // illegible (or hard-to-read, at least) then don't
                            // render the text.
                            "min-zoomed-font-size": 12,
                            "z-index": 2,
                            "background-color": $("#usncp").colorpicker(
                                "getValue"
                            ),
                            // Uncomment this (and comment out the entry above)
                            // to use a random color for each node, provided
                            // these random color is generated in renderNode().
                            // (Keep in mind how dup nodes are labeled...)
                            // "background-color": "data(randColor)",
                        },
                    },
                    // TODO: add a generalized "colorized" class or something
                    // for coloring by GC content, coverage, ...
                    {
                        selector: "node.basic.leftdir",
                        style: {
                            // Represents a node pointing left (i.e. in the
                            // reverse direction, if the graph flows from left
                            // to right)
                            //  ___
                            // /   |
                            // \___|
                            shape: "polygon",
                            "shape-polygon-points":
                                "1 1 -0.23587 1 -1 0 -0.23587 -1 1 -1",
                        },
                    },
                    {
                        selector: "node.basic.rightdir",
                        style: {
                            // Represents a node pointing left (i.e. in the
                            // reverse direction, if the graph flows from left
                            // to right)
                            //  ___
                            // |   \
                            // |___/
                            shape: "polygon",
                            "shape-polygon-points":
                                "-1 1 0.23587 1 1 0 0.23587 -1 -1 -1",
                        },
                    },
                    // Just for debugging. For now, at least.
                    {
                        selector: "node.is_dup",
                        style: {
                            "background-color": "#cc00cc",
                        },
                    },
                    {
                        selector: "node.basic.tentative",
                        style: {
                            "border-width": 5,
                            "border-color": $("#tnbcp").colorpicker("getValue"),
                        },
                    },
                    {
                        selector: "node.pattern.tentative",
                        style: {
                            "border-width": 5,
                            "border-color": $("#tngbcp").colorpicker(
                                "getValue"
                            ),
                        },
                    },
                    {
                        selector: "node.currpath",
                        style: {
                            "background-color": $("#cpcp").colorpicker(
                                "getValue"
                            ),
                        },
                    },
                    {
                        selector: "node.basic:selected",
                        style: {
                            "background-color": $("#sncp").colorpicker(
                                "getValue"
                            ),
                        },
                    },
                    {
                        selector: "node.basic.noncolorized:selected",
                        style: {
                            color: $("#snlcp").colorpicker("getValue"),
                        },
                    },
                    {
                        selector: "node.basic.gccolorized:selected",
                        style: {
                            color: $("#csnlcp").colorpicker("getValue"),
                        },
                    },
                    {
                        selector: "node.pattern:selected",
                        style: {
                            "border-width": 5,
                            "border-color": $("#sngbcp").colorpicker(
                                "getValue"
                            ),
                        },
                    },
                    {
                        selector: "edge",
                        style: {
                            width: "data(thickness)",
                            "line-color": $("#usecp").colorpicker("getValue"),
                            "target-arrow-color": $("#usecp").colorpicker(
                                "getValue"
                            ),
                            "loop-direction": "30deg",
                            "z-index": 1,
                            "z-index-compare": "manual",
                            "target-arrow-shape": "triangle",
                            "target-endpoint": "-50% 0%",
                            "source-endpoint": "50% 0",
                        },
                    },
                    {
                        selector: "edge:selected",
                        style: {
                            "line-color": $("#secp").colorpicker("getValue"),
                            "target-arrow-color": $("#secp").colorpicker(
                                "getValue"
                            ),
                        },
                    },
                    {
                        selector: "edge:loop",
                        style: {
                            "z-index": 5,
                        },
                    },
                    {
                        // Used for edges that were assigned valid (i.e. not
                        // just a straight line or self-directed edge)
                        // cpd/cpw properties from the xdot file.
                        selector: "edge.unbundledbezier",
                        style: {
                            "curve-style": "unbundled-bezier",
                            "control-point-distances": "data(cpd)",
                            "control-point-weights": "data(cpw)",
                            "edge-distances": "node-position",
                        },
                    },
                    {
                        // Used for:
                        //  -Self-directed edges
                        //  -Lines that are determined upon parsing the xdot file to
                        //   be sufficiently close to a straight line
                        //  -Temporary edges, for which we have no control point
                        //   data (i.e. any edges directly from/to compound nodes
                        //   during the collapsing process)
                        selector: "edge.basicbezier",
                        style: {
                            "curve-style": "bezier",
                        },
                    },
                    {
                        // Used for edges incident on collapsed patterns. These
                        // edges no longer have their control point data in
                        // use, so making them hit the tailport / headport of
                        // their source / target looks really gross. So we just
                        // say "screw it, any direction is ok."
                        selector: "edge.not_using_ports",
                        style: {
                            "source-endpoint": "outside-to-node",
                            "target-endpoint": "outside-to-node",
                        },
                    },
                    {
                        selector: "edge.is_dup",
                        style: {
                            "line-style": "dashed",
                        },
                    },
                    {
                        selector: "edge.high_outlier",
                        style: {
                            "line-color": $("#hoecp").colorpicker("getValue"),
                            "target-arrow-color": $("#hoecp").colorpicker(
                                "getValue"
                            ),
                        },
                    },
                    {
                        selector: "edge.high_outlier:selected",
                        style: {
                            "line-color": $("#hosecp").colorpicker("getValue"),
                            "target-arrow-color": $("#hosecp").colorpicker(
                                "getValue"
                            ),
                        },
                    },
                    {
                        selector: "edge.low_outlier",
                        style: {
                            "line-color": $("#loecp").colorpicker("getValue"),
                            "target-arrow-color": $("#loecp").colorpicker(
                                "getValue"
                            ),
                        },
                    },
                    {
                        selector: "edge.low_outlier:selected",
                        style: {
                            "line-color": $("#losecp").colorpicker("getValue"),
                            "target-arrow-color": $("#losecp").colorpicker(
                                "getValue"
                            ),
                        },
                    },
                ],
            });
            this.setGraphBindings();
        }

        /**
         * Records incoming/outgoing edges and all interior elements of
         * patterns.
         *
         * Basically, this function sets up a bunch of details that will make
         * collapsing and uncollapsing a lot easier later on.
         *
         * This should be called after all elements (nodes, edges, patterns)
         * have been added to the Cytoscape.js instance, but before drawing is
         * finished (i.e. before the user can interact with the graph).
         *
         * This was previously known as initClusters() in the old version of
         * MetagenomeScope. As you may have noticed if you're reading over this
         * code, I was previously being inconsistent and periodically used the
         * terms "Node Group", "Cluster", "Pattern", etc. to refer to patterns.
         * I'm trying to just be consistent and say "Pattern" now :P
         */
        initPatterns() {
            // For each pattern...
            this.cy.$("node.pattern").each(function (pattern, i) {
                var children = pattern.children();
                // Unfiltered incoming/outgoing edges
                var uIncomingEdges = children.incomers("edge");
                var uOutgoingEdges = children.outgoers("edge");
                // Actual incoming/outgoing edges -- will be move()'d as
                // this pattern/adjacent pattern(s) are collapsed/uncollapsed
                var incomingEdges = uIncomingEdges.difference(uOutgoingEdges);
                var outgoingEdges = uOutgoingEdges.difference(uIncomingEdges);
                // Mapping of edge ID to [cSource, cTarget]
                // Used since move() removes references to edges, so storing IDs
                // is more permanent
                var incomingEdgeMap = {};
                var outgoingEdgeMap = {};
                // "Canonical" incoming/outgoing edge properties -- these
                // are used to represent the ideal connections
                // between nodes regardless of collapsing
                incomingEdges.each(function (edge, j) {
                    incomingEdgeMap[edge.id()] = [
                        edge.source().id(),
                        edge.target().id(),
                    ];
                });
                outgoingEdges.each(function (edge, j) {
                    outgoingEdgeMap[edge.id()] = [
                        edge.source().id(),
                        edge.target().id(),
                    ];
                });
                // Get the "interior elements" of the pattern: all child nodes,
                // plus the edges connecting child nodes within the pattern
                // This considers cyclic edges (e.g. the edge connecting a
                // cycle's "end" and "start" nodes) as "interior elements,"
                // which makes sense as they don't connect the cycle's children
                //  to any elements outside the cycle.
                var interiorEdges = children
                    .connectedEdges()
                    .difference(incomingEdges)
                    .difference(outgoingEdges);
                // Record incoming/outgoing edges in this
                // pattern's data. Will be useful during collapsing.
                // We also record "interiorNodes" -- having a reference to just
                // these nodes saves us the time of filtering nodes out of
                // interiorEles when rotating collapsed node groups.
                //
                // Set the label of this pattern when collapsed.
                var numChildren = children.size();
                var collapsedLabel = numChildren + " child";
                if (numChildren > 1) {
                    collapsedLabel += "ren";
                }
                pattern.data({
                    incomingEdgeMap: incomingEdgeMap,
                    outgoingEdgeMap: outgoingEdgeMap,
                    collapsedLabel: collapsedLabel,
                });
                // We store collections of elements in the pattern's scratch
                // data. Storing it in the main "data" section will mess up
                // JSON exporting, since it isn't serializable.
                // TODO reduce redundancy here -- only store interiorEles, and in
                // rotateNodes just select nodes from interiorEles
                pattern.scratch({
                    _interiorEles: interiorEdges.union(children),
                    _interiorNodes: children,
                });
            });
        }

        renderPattern(pattAttrs, pattVals, dx, dy) {
            var pattID = pattVals[pattAttrs.pattern_id];
            var pattData = {
                id: pattID,
                w: pattVals[pattAttrs.width],
                h: pattVals[pattAttrs.height],
                isCollapsed: false,
            };

            // Add parent ID, if needed.
            // This is safe, because the data export from the python code
            // ensures that, for each parent pattern in a component, this
            // parent pattern is stored earlier in the pattern array than the
            // child pattern(s) within it.
            var parentID = pattVals[pattAttrs.parent_id];
            if (!_.isNull(parentID)) {
                pattData.parent = parentID;
            }

            var classes = "pattern";
            if (pattVals[pattAttrs.pattern_type] === "chain") {
                classes += " C";
            } else if (pattVals[pattAttrs.pattern_type] === "cyclicchain") {
                classes += " Y";
            } else if (pattVals[pattAttrs.pattern_type] === "bubble") {
                classes += " B";
            } else if (pattVals[pattAttrs.pattern_type] === "frayedrope") {
                classes += " F";
            } else {
                classes += " M";
            }
            var x = (pattVals[pattAttrs.left] + pattVals[pattAttrs.right]) / 2;
            var y =
                dy - (pattVals[pattAttrs.bottom] + pattVals[pattAttrs.top]) / 2;
            this.cy.add({
                data: pattData,
                position: { x: x, y: y },
                classes: classes,
            });
            if (this.VERBOSE) {
                console.log(
                    "Rendered pattern " + pattID + " at (" + x + ", " + y + ")"
                );
            }
            this.numDrawnPatterns++;
        }

        /**
         * Produces a random hex color.
         *
         * @param {Number} minChannelVal Minimum value, in base 10, of any
         *                               R/G/B channel. Depending on the use
         *                               case for these colors, we may or may
         *                               not want to have this be above 0.
         *                               (e.g. for coloring nodes: we currently
         *                               just use black text to label nodes,
         *                               so we use a value of 50 for this to
         *                               make node labels easier to read.)
         *
         * @param {Number} maxChannelVal Maximum value, in base 10, of any
         *                               R/G/B channel. Similar considerations
         *                               as with minChannelVal apply.
         *
         * @return {String} hexColor In the format "#rrggbb".
         */
        randomColor(minChannelVal = 100, maxChannelVal = 205) {
            var channelRange = maxChannelVal - minChannelVal;
            var hexColor = "#";
            _.times(3, function () {
                var channel =
                    minChannelVal + Math.floor(Math.random() * channelRange);
                var hexChannel = channel.toString(16);
                if (hexChannel.length === 1) {
                    hexChannel = "0" + hexChannel;
                }
                hexColor += hexChannel;
            });
            return hexColor;
        }

        renderNode(nodeAttrs, nodeVals, nodeID, dx, dy) {
            var nodeData = {
                id: nodeID,
                label: nodeVals[nodeAttrs.name],
                length: nodeVals[nodeAttrs.length],
                w: nodeVals[nodeAttrs.width],
                h: nodeVals[nodeAttrs.height],
                // randColor: this.randomColor(),
            };

            // Store within parent, if needed
            var parentID = nodeVals[nodeAttrs.parent_id];
            if (!_.isNull(parentID)) {
                nodeData.parent = parentID;
                // TODO update a global ele2parent thing for collpasing /
                // searching?
            }

            // Figure out node orientation and shape
            var classes = "basic";
            var orientation = nodeVals[nodeAttrs.orientation];
            if (orientation === "+") {
                classes += " rightdir";
            } else if (orientation === "-") {
                classes += " leftdir";
            } else {
                throw new Error("Invalid node orientation " + orientation);
            }

            if (nodeVals[nodeAttrs.is_dup]) {
                classes += " is_dup";
            }

            var x = nodeVals[nodeAttrs.x];
            var y = dy - nodeVals[nodeAttrs.y];
            var data = {
                data: nodeData,
                position: { x: x, y: y },
                classes: classes,
            };
            this.cy.add(data);
            if (this.VERBOSE) {
                console.log(
                    "Rendered node " +
                        nodeID +
                        " (name " +
                        nodeVals[nodeAttrs.name] +
                        ") at (" +
                        x +
                        ", " +
                        y +
                        ")"
                );
            }
            this.numDrawnNodes++;
            return [x, y];
        }

        /**
         * Given a start node position, an end node position, and the
         * control points of an edge connecting the two nodes, converts
         * the control points into arrays of "distances" and "weights" that
         * Cytoscape.js can use when drawing an unbundled Bezier edge.
         *
         * For more information about what "distances" and "weights" mean in
         * this context (it's been so long since I first wrote this code that I
         * forget the details...), see Cytoscape.js' documentation at
         * https://js.cytoscape.org/#style/unbundled-bezier-edges. The Cliff
         * Notes explanation is that this is just a way of representing
         * control points besides literally just listing the control points, as
         * GraphViz does.
         *
         * Note that all of the Array parameters below should have only Numbers
         * as their values.
         *
         * @param {Array} srcPos Of the format [x, y].
         * @param {Array} tgtPos Of the format [x, y].
         * @param {Array} ctrlPts Of the format [x1, y1, x2, y2, ...].
         * @param {Number} dx Value to add to every control point x-coordinate
         * @param {Number} dy Value to add to every control point y-coordinate
         *
         * @return {Object} Has the following keys:
         *                  -complex: Maps to a Boolean. If this is true,
         *                   then this edge cannot be easily approximated with
         *                   a straight line, and an unbundled Bezier curve
         *                   should thus be drawn for this edge. If this is
         *                   false, then we can probably just draw a straight
         *                   line (i.e. using the class "basicbezier") for this
         *                   edge, and the "dists" and "weights" keys in this
         *                   Object can probably be ignored.
         *
         *                  -dists: Maps to an Array of Numbers representing
         *                   the distances from each control point to a line
         *                   from the source to the target position. Usable as
         *                   the "cpd" data attribute for unbundled bezier
         *                   edges.
         *
         *                  -weights: Maps to an Array of Numbers representing
         *                   the "weights" of each control point along a line
         *                   from the source to the target position. Usable as
         *                   the "cpw" data attribute for unbundled bezier
         *                   edges.
         */
        convertCtrlPtsToDistsAndWeights(srcPos, tgtPos, ctrlPts, dx, dy) {
            var srcTgtDist = utils.distance(srcPos, tgtPos);
            var complex = false;
            var ctrlPtDists = "";
            var ctrlPtWeights = "";
            var currPt, pld, pldsquared, dsp, dtp, w, ws, wt;
            for (var p = 0; p < ctrlPts.length; p += 2) {
                currPt = [ctrlPts[p], dy - ctrlPts[p + 1]];
                pld = utils.pointToLineDistance(currPt, srcPos, tgtPos);
                pldsquared = Math.pow(pld, 2);
                dsp = utils.distance(currPt, srcPos);
                dtp = utils.distance(currPt, tgtPos);
                // By the pythagorean thm., the interior of the square root
                // below should always be positive -- the hypotenuse must
                // always be greater than both of the other sides of a right
                // triangle.
                // However, due to Javascript's lovely (...)
                // type system, rounding errors can cause the hypotenuse (dsp
                // or dtp)
                // be represented as slightly less than d. So, to account for
                // these cases, we just take the abs. value of the sqrt body.
                // NOTE that ws = distance on line to source;
                //           wt = distance on line to target
                ws = Math.sqrt(Math.abs(Math.pow(dsp, 2) - pldsquared));
                wt = Math.sqrt(Math.abs(Math.pow(dtp, 2) - pldsquared));
                // Get the weight of the control point on the line between
                // source and sink oriented properly -- if the control point is
                // "behind" the source node, we make it negative, and if the
                // point is "past" the sink node, we make it > 1. Everything in
                // between the source and sink falls within [0, 1] inclusive.
                if (wt > srcTgtDist && wt > ws) {
                    // The ctrl. pt. is "behind" the source node
                    w = -ws / srcTgtDist;
                } else {
                    // The ctrl. pt. is anywhere past the source node
                    w = ws / srcTgtDist;
                }
                // If we detect all of the control points of an edge are less
                // than some epsilon value, we just render the edge as a normal
                // bezier (which defaults to a straight line).
                if (Math.abs(pld) > this.CTRL_PT_DIST_EPSILON) {
                    complex = true;
                }
                // Control points with a weight of 0 (as the first ctrl pt)
                // or a weight of 1 (as the last ctrl pt) aren't valid due
                // to implicit points already "existing there."
                // (See https://github.com/cytoscape/cytoscape.js/issues/1451)
                // This preemptively rectifies such control points.
                if (p === 0 && w === 0.0) {
                    w = 0.01;
                } else if (p == ctrlPts.length - 2 && w === 1.0) {
                    w = 0.99;
                }
                ctrlPtDists += pld.toFixed(2) + " ";
                ctrlPtWeights += w.toFixed(2) + " ";
            }
            return {
                complex: complex,
                dists: ctrlPtDists.trim(),
                weights: ctrlPtWeights.trim(),
            };
        }

        renderEdge(edgeAttrs, edgeVals, node2pos, srcID, tgtID, dx, dy) {
            // Scale edge thickness, and see if it's an "outlier" or not
            var edgeWidth =
                this.MIN_EDGE_THICKNESS +
                edgeVals[edgeAttrs.relative_weight] * this.EDGE_THICKNESS_RANGE;
            var classes = "oriented";
            if (edgeVals[edgeAttrs.is_outlier] === 1) {
                classes += " high_outlier";
            } else if (edgeVals[edgeAttrs.is_outlier] === -1) {
                classes += " low_outlier";
            }

            if (edgeVals[edgeAttrs.is_dup]) {
                classes += " is_dup";
            }

            var data = {
                source: srcID,
                target: tgtID,
                thickness: edgeWidth,
            };

            var parentID = edgeVals[edgeAttrs.parent_id];
            if (!_.isNull(parentID)) {
                data.parent = parentID;
            }

            if (srcID === tgtID) {
                // It's a self-directed edge; don't bother parsing ctrl pt
                // info, just render it as a bezier edge and be done with it
                this.cy.add({
                    classes: classes + " basicbezier",
                    data: data,
                });
            } else {
                var srcPos = node2pos[srcID];
                var tgtPos = node2pos[tgtID];
                if (!_.has(node2pos, srcID) || !_.has(node2pos, tgtID)) {
                    console.log("node2pos: ", node2pos);
                    console.log("src ID: ", srcID);
                    console.log("tgt ID: ", tgtID);
                    throw new Error("ID(s) not in node2pos...?");
                }
                var ctrlPts = edgeVals[edgeAttrs.ctrl_pt_coords];
                var ctrlPtData = this.convertCtrlPtsToDistsAndWeights(
                    srcPos,
                    tgtPos,
                    ctrlPts,
                    dx,
                    dy
                );
                if (ctrlPtData.complex) {
                    // Control points are valid
                    data.cpd = ctrlPtData.dists;
                    data.cpw = ctrlPtData.weights;
                    this.cy.add({
                        classes: classes + " unbundledbezier",
                        data: data,
                    });
                } else {
                    // Control point distances from a straight line between
                    // source and sink are small enough that we can just
                    // approximate this edge as a straight line
                    this.cy.add({
                        classes: classes + " basicbezier",
                        data: data,
                    });
                }
            }
            this.numDrawnEdges++;
        }

        /**
         * Sets bindings for various user interactions with the graph.
         *
         * These bindings cover a lot of the useful things in MetagenomeScope's
         * interface -- collapsing/uncollapsing patterns, selecting elements,
         * etc.
         *
         * This should be called every time the graph is initialized.
         */
        setGraphBindings() {
            this.cy.on(
                "select",
                "node.basic, edge, node.pattern",
                this.onSelect
            );
            this.cy.on(
                "unselect",
                "node.basic, edge, node.pattern",
                this.onUnselect
            );
            this.cy.on("cxttap", "node.pattern", this.onTogglePatternCollapse);
        }

        /**
         * Draws component(s) in the graph.
         *
         * This effectively involves remaking the instance of Cytoscape.js in
         * use, so we require that some callbacks
         *
         * @param {Array} componentsToDraw 1-indexed size rank numbers of the
         *                                 component(s) to draw.
         *
         * @param {DataHolder} dataHolder Object containing graph data.
         *
         * @throws {Error} If componentsToDraw contains duplicate values and/or
         *                 if any of the numbers within it are invalid with
         *                 respect to the dataHolder.
         */
        draw(componentsToDraw, dataHolder) {
            var scope = this;
            if (!_.isNull(this.cy)) {
                this.destroyGraph();
            }
            this.initGraph();
            this.cy.startBatch();
            // These are the "offsets" from the top-left of each component's
            // bounding box, used when drawing multiple components at once.
            var maxWidth = null;
            var dx = 0;
            var dy = 0;
            _.each(componentsToDraw, function (sizeRank) {
                // Draw patterns
                var pattAttrs = dataHolder.getPattAttrs();
                _.each(dataHolder.getPatternsInComponent(sizeRank), function (
                    pattVals
                ) {
                    scope.renderPattern(pattAttrs, pattVals, dx, dy);
                });

                // Draw nodes
                var node2pos = {};
                var nodeAttrs = dataHolder.getNodeAttrs();
                _.each(dataHolder.getNodesInComponent(sizeRank), function (
                    nodeVals,
                    nodeID
                ) {
                    var pos = scope.renderNode(
                        nodeAttrs,
                        nodeVals,
                        nodeID,
                        dx,
                        dy
                    );
                    node2pos[nodeID] = pos;
                });

                // Draw edges
                var edgeAttrs = dataHolder.getEdgeAttrs();
                // Edges are a bit different: they're structured as
                // {srcID: {tgtID: edgeVals, tgtID2: edgeVals}, ...}
                _.each(dataHolder.getEdgesInComponent(sizeRank), function (
                    edgesFromSrcID,
                    srcID
                ) {
                    _.each(edgesFromSrcID, function (edgeVals, tgtID) {
                        scope.renderEdge(
                            edgeAttrs,
                            edgeVals,
                            node2pos,
                            srcID,
                            tgtID,
                            dx,
                            dy
                        );
                    });
                });

                // If we're drawing multiple components at once, let's update
                // dx and dy so that we can place other components somewhere
                // that doesn't interfere with previously-drawn components.
                var componentBoundingBox = dataHolder.getComponentBoundingBox(
                    sizeRank
                );
                // The 50 gives us some breathing room between adjacent comps;
                // not an ideal solution but it works (tm)
                dy -= componentBoundingBox[1] + 50;
            });
            this.initPatterns();
            this.finishDraw();
        }

        /**
         * Enables interaction with the graph interface after drawing.
         */
        finishDraw() {
            this.cy.endBatch();
            this.cy.fit();
            // Set minZoom to whatever the zoom level when viewing the entire drawn
            // component at once (i.e. right now) is, divided by 2 to give some
            // leeway for users to zoom out if they want
            this.cy.minZoom(this.cy.zoom() / 2);

            // Enable interaction with the graph
            this.cy.userPanningEnabled(true);
            this.cy.userZoomingEnabled(true);
            this.cy.boxSelectionEnabled(true);
            this.cy.autounselectify(false);
            this.cy.autoungrabify(false);
        }

        /**
         * Adjusts the size of the Cytoscape.js area.
         *
         * Should be called whenever the page dimensions are changed (i.e. the
         * control panel is hidden / un-hidden).
         */
        toggleSize() {
            this.cyDiv.toggleClass("nosubsume");
            this.cyDiv.toggleClass("subsume");
            if (!_.isNull(this.cy)) {
                this.cy.resize();
            }
        }

        /**
         * Fits the graph: either to all elements or just to those selected.
         *
         * @param {Boolean} toSelected If true, fit to just the currently-
         *                             selected elements in the graph; if
         *                             false, fit to all drawn elements.
         */
        fit(toSelected) {
            // TODO: use progress bar
            if (toSelected) {
                // Right now, we don't throw any sort of error here if
                // no elements are selected. This is because the fit-selected
                // button should only be enabled when >= 1 elements are
                // selected.
                this.cy.fit(this.cy.$(":selected"));
            } else {
                this.cy.fit();
            }
        }

        /**
         * Makes an edge "basic" -- if it isn't already a basicbezier, makes it
         * a basicbezier (i.e. makes it basically a straight line), and also
         * adds the not_using_ports class (no longer constrains it to hitting
         * the exact end / start of its source / end nodes).
         *
         * @param {Cytoscape.js edge Element} edgeEle
         */
        makeEdgeBasic(edgeEle) {
            if (edgeEle.data("cpd")) {
                edgeEle.removeClass("unbundledbezier");
                edgeEle.addClass("basicbezier");
            }
            edgeEle.addClass("not_using_ports");
        }

        /**
         * Reverses what makeEdgeBasic() does.
         *
         * @param {Cytoscape.js edge Element} edgeEle
         */
        makeEdgeNonBasic(edgeEle) {
            if (edgeEle.data("cpd")) {
                edgeEle.removeClass("basicbezier");
                edgeEle.addClass("unbundledbezier");
            }
            edgeEle.removeClass("not_using_ports");
        }

        /**
         * Collapses a pattern, taking care of the display-level details.
         *
         * @param {Cytoscape.js node Element} pattern
         */
        collapsePattern(pattern) {
            this.cy.startBatch();
            var pattID = pattern.id();
            // For each edge with a target in the compound node...
            var oldIncomingEdge;
            for (var incomingEdgeID in pattern.data("incomingEdgeMap")) {
                oldIncomingEdge = this.cy.getElementById(incomingEdgeID);
                this.makeEdgeBasic(oldIncomingEdge);
                oldIncomingEdge.move({ target: pattID });
            }

            // For each edge with a source in the compound node...
            var oldOutgoingEdge;
            for (var outgoingEdgeID in pattern.data("outgoingEdgeMap")) {
                oldOutgoingEdge = this.cy.getElementById(outgoingEdgeID);
                this.makeEdgeBasic(oldOutgoingEdge);
                oldOutgoingEdge.move({ source: pattID });
            }
            pattern.data("isCollapsed", true);
            // Unselect the elements before removing them (fixes #158 on GitHub)
            pattern.scratch("_interiorEles").unselect();
            // "Remove" the elements (they can be added back to the graph upon
            // uncollapsing this pattern, of course)
            pattern.scratch("_interiorEles").remove();
            this.cy.endBatch();
        }

        /**
         * Reverses collapsePattern().
         *
         * @param {Cytoscape.js node Element} Pattern
         */
        uncollapsePattern(pattern) {
            this.cy.startBatch();
            // Restore child nodes + interior edges
            pattern.scratch("_interiorEles").restore();
            // "Reset" edges to their original target/source within the pattern
            var oldIncomingEdge, newTgt;
            for (var incomingEdgeID in pattern.data("incomingEdgeMap")) {
                // TODO / NOTE: Edge weight removal isn't implemented yet so
                // for now we don't gotta worry about this
                // if (mgsc.REMOVED_EDGES.is('[id="' + incomingEdgeID + '"]')) {
                //     // The edge has probably been removed from the graph due to
                //     // the edge weight thing -- ignore it
                //     continue;
                // }
                newTgt = pattern.data("incomingEdgeMap")[incomingEdgeID][1];
                oldIncomingEdge = this.cy.getElementById(incomingEdgeID);
                // If the edge isn't connected to another pattern, and the edge
                // wasn't a basicbezier to start off with (i.e. it has control point
                // data), then change its classes to update its style.
                if (!oldIncomingEdge.source().hasClass("pattern")) {
                    // TODO / NOTE: Also, "reducing" edges to straight lines
                    // isn't implemented yet, so again don't gotta worry about
                    // this. But we may in the future.
                    // if (!oldIncomingEdge.hasClass("reducededge")) {
                    this.makeEdgeNonBasic(oldIncomingEdge);
                    // }
                }
                oldIncomingEdge.move({ target: newTgt });
            }
            var oldOutgoingEdge, newSrc;
            for (var outgoingEdgeID in pattern.data("outgoingEdgeMap")) {
                // if (mgsc.REMOVED_EDGES.is('[id="' + outgoingEdgeID + '"]')) {
                //     continue;
                // }
                newSrc = pattern.data("outgoingEdgeMap")[outgoingEdgeID][0];
                oldOutgoingEdge = this.cy.getElementById(outgoingEdgeID);
                if (!oldOutgoingEdge.target().hasClass("pattern")) {
                    // if (!oldOutgoingEdge.hasClass("reducededge")) {
                    this.makeEdgeNonBasic(oldOutgoingEdge);
                    // }
                }
                oldOutgoingEdge.move({ source: newSrc });
            }
            // Update local flag for collapsed status (useful for local toggling)
            pattern.data("isCollapsed", false);
            this.cy.endBatch();
        }
    }
    return { Drawer: Drawer };
});
