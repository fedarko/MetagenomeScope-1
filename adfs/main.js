/**
 * Adapted from
 * https://github.com/biocore/qurro/blob/master/qurro/support_files/main.js.
 */
requirejs.config({
    baseUrl: "js",
    paths: {
        jquery: "../vendor/js/jquery-3.2.1.min",
        underscore: "../vendor/js/underscore-min",
        bootstrap: "../vendor/js/bootstrap.min",
        cytoscape: "../vendor/js/cytoscape.min",
        "cytoscape-expand-collapse": "../vendor/js/cytoscape-expand-collapse",
        "bootstrap-colorpicker": "../vendor/js/bootstrap-colorpicker.min",
    },
    shim: {
        bootstrap: { deps: ["jquery"] },
        "bootstrap-colorpicker": { deps: ["bootstrap", "jquery"] },
    },
});
requirejs(
    [
        "app-manager",
        "data-holder",
        "drawer",
        "utils",
        "dom-utils",
        "jquery",
        "underscore",
        "bootstrap",
        "bootstrap-colorpicker",
        "cytoscape",
        "cytoscape-expand-collapse",
    ],
    function (AppManager, DataHolder, Drawer, Utils, DomUtils, $, _, bootstrap, bootstrapColorpicker, cy, cyEC) {
        // Get the graph data JSON from the preprocessing script.
        var dataJSON = {"node_attrs": {"name": 0, "length": 1, "x": 2, "y": 3, "width": 4, "height": 5, "orientation": 6, "parent_id": 7, "is_dup": 8}, "edge_attrs": {"ctrl_pt_coords": 0, "is_outlier": 1, "relative_weight": 2, "is_dup": 3, "parent_id": 4, "bsize": 5, "stdev": 6, "mean": 7, "orientation": 8}, "patt_attrs": {"pattern_id": 0, "left": 1, "bottom": 2, "right": 3, "top": 4, "width": 5, "height": 6, "pattern_type": 7, "parent_id": 8}, "extra_node_attrs": [], "extra_edge_attrs": ["bsize", "stdev", "mean", "orientation"], "components": [{"nodes": {"2": ["2", 1, -1221.0, 63.5, 196.2979100576472, 111.205972562771, "+", null, false], "3": ["3", 1, -1221.0, 208.5, 196.2979100576472, 111.205972562771, "+", null, false], "4": ["4", 1, -961.0, 135.5, 196.2979100576472, 111.205972562771, "+", null, false], "5": ["5", 1, -701.0, 63.5, 196.2979100576472, 111.205972562771, "+", null, false], "6": ["6", 1, -701.0, 208.5, 196.2979100576472, 111.205972562771, "+", null, false], "0": ["0", 1, -1775.5, 135.5, 196.2979100576472, 111.205972562771, "+", 9, false], "1": ["1", 1, -1515.5, 135.5, 196.2979100576472, 111.205972562771, "+", 9, false], "7": ["7", 1, -406.5, 135.5, 196.2979100576472, 111.205972562771, "+", 10, false], "8": ["8", 1, -146.5, 135.5, 196.2979100576472, 111.205972562771, "+", 10, false]}, "edges": {"0": {"1": [[-1663.5, 135.5, -1642.5, 135.5, -1634.79, 135.5, -1617.94, 135.5], 0, 0.5, false, 9, 5, 5, "-1", "EB"]}, "7": {"8": [[-294.5, 135.5, -273.5, 135.5, -265.78999999999996, 135.5, -248.94, 135.5], 0, 0.5, false, 10, 5, 5, "-1", "EB"]}, "2": {"4": [[-1109.0, 63.5, -1072.4, 63.5, -1089.3, 122.12, -1063.1, 133.57], 0, 0.5, false, null, 5, 5, "-1", "EB"]}, "3": {"4": [[-1109.0, 208.5, -1071.9, 208.5, -1089.6, 148.55, -1062.9, 137.3], 0, 0.5, false, null, 5, 5, "-1", "EB"]}, "4": {"5": [[-849.0, 135.5, -812.42, 135.5, -829.27, 76.876, -803.12, 65.426], 0, 0.5, false, null, 5, 5, "-1", "EB"], "6": [[-849.0, 135.5, -811.94, 135.5, -829.64, 195.45, -802.85, 206.7], 0, 0.5, false, null, 5, 5, "-1", "EB"]}, "5": {"7": [[-589.0, 63.5, -557.42, 63.5, -581.42, 119.61, -562.87, 132.77], 0, 0.5, false, null, 5, 5, "-1", "EB"]}, "6": {"7": [[-589.0, 208.5, -556.92, 208.5, -581.87, 151.1, -562.71, 138.1], 0, 0.5, false, null, 5, 5, "-1", "EB"]}, "1": {"2": [[-1369.0, 135.5, -1332.4, 135.5, -1349.3, 76.876, -1323.1, 65.426], 0, 0.5, false, null, 5, 5, "-1", "EB"], "3": [[-1369.0, 135.5, -1331.9, 135.5, -1349.6, 195.45, -1322.9, 206.7], 0, 0.5, false, null, 5, 5, "-1", "EB"]}}, "patts": [[9, -1887.5, -72.0, -1403.5, -199.0, 484.0, 127.0, "chain", null], [10, -518.5, -72.0, -34.5, -199.0, 484.0, 127.0, "chain", null]], "bb": [1922.0, 272.0], "skipped": false}], "input_file_basename": "bubble_chain_test.gml", "input_file_type": "gml", "total_num_nodes": 9, "total_num_edges": 10};
        var dh = new DataHolder.DataHolder(dataJSON);
        new AppManager.AppManager(dh);
    }
);