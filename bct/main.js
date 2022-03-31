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
        var dataJSON = {"node_attrs": {"name": 0, "length": 1, "x": 2, "y": 3, "width": 4, "height": 5, "orientation": 6, "parent_id": 7, "is_dup": 8}, "edge_attrs": {"ctrl_pt_coords": 0, "is_outlier": 1, "relative_weight": 2, "is_dup": 3, "parent_id": 4, "mean": 5, "bsize": 6, "stdev": 7, "orientation": 8}, "patt_attrs": {"pattern_id": 0, "left": 1, "bottom": 2, "right": 3, "top": 4, "width": 5, "height": 6, "pattern_type": 7, "parent_id": 8}, "extra_node_attrs": [], "extra_edge_attrs": ["mean", "bsize", "stdev", "orientation"], "components": [{"nodes": {"0": ["0", 1, -2026.5, 177.5, 196.2979100576472, 111.205972562771, "+", 9, false], "1": ["1", 1, -1766.5, 177.5, 196.2979100576472, 111.205972562771, "+", 9, false], "2": ["2", 1, -1419.0, 105.0, 196.2979100576472, 111.205972562771, "+", 11, false], "3": ["3", 1, -1419.0, 250.0, 196.2979100576472, 111.205972562771, "+", 11, false], "4": ["4", 1, -1159.0, 177.0, 196.2979100576472, 111.205972562771, "+", 11, false], "5": ["5", 1, -899.0, 105.0, 196.2979100576472, 111.205972562771, "+", 11, false], "6": ["6", 1, -899.0, 250.0, 196.2979100576472, 111.205972562771, "+", 11, false], "7": ["7", 1, -551.5, 177.5, 196.2979100576472, 111.205972562771, "+", 10, false], "8": ["8", 1, -291.5, 177.5, 196.2979100576472, 111.205972562771, "+", 10, false]}, "edges": {"1": {"3": [[-1620.0, 177.5, -1608.0, 177.5, -1602.8, 177.5, -1594.1, 177.5], 0, 0.5, false, 12, "-1", 5, 5, "EB"]}, "6": {"7": [[-734.0, 177.5, -722.0, 177.5, -716.75, 177.5, -708.12, 177.5], 0, 0.5, false, 12, "-1", 5, 5, "EB"]}, "0": {"1": [[-1914.5, 177.5, -1893.5, 177.5, -1885.79, 177.5, -1868.94, 177.5], 0, 0.5, false, 9, "-1", 5, 5, "EB"]}, "2": {"4": [[-1307.0, 105.0, -1270.42, 105.0, -1287.27, 163.62, -1261.12, 175.07], 0, 0.5, false, 11, "-1", 5, 5, "EB"]}, "3": {"4": [[-1307.0, 250.0, -1269.94, 250.0, -1287.6399999999999, 190.05, -1260.85, 178.8], 0, 0.5, false, 11, "-1", 5, 5, "EB"]}, "4": {"5": [[-1047.0, 177.0, -1010.42, 177.0, -1027.27, 118.376, -1001.12, 106.926], 0, 0.5, false, 11, "-1", 5, 5, "EB"], "6": [[-1047.0, 177.0, -1009.94, 177.0, -1027.6399999999999, 236.95, -1000.85, 248.2], 0, 0.5, false, 11, "-1", 5, 5, "EB"]}, "7": {"8": [[-439.5, 177.5, -418.5, 177.5, -410.78999999999996, 177.5, -393.94, 177.5], 0, 0.5, false, 10, "-1", 5, 5, "EB"]}}, "patts": [[12, -2173.0, -22.0, -145.0, -333.0, 2028.0, 311.0, "chain", null], [9, -2138.5, -114.0, -1654.5, -241.0, 484.0, 127.0, "chain", 12], [11, -1531.0, -41.5, -787.0, -313.5, 744.0, 272.0, "frayedrope", 12], [10, -663.5, -114.0, -179.5, -241.0, 484.0, 127.0, "chain", 12]], "bb": [2318.0, 355.0], "skipped": false}], "input_file_basename": "bubble_chain_test.gml", "input_file_type": "gml", "total_num_nodes": 9, "total_num_edges": 10};
        var dh = new DataHolder.DataHolder(dataJSON);
        new AppManager.AppManager(dh);
    }
);