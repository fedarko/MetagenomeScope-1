# MetagenomeScope
[![Build Status](https://travis-ci.org/marbl/MetagenomeScope.svg?branch=master)](https://travis-ci.org/marbl/MetagenomeScope)

![Screenshot of MetagenomeScope's standard mode, showing a region of a biofilm assembly graph](https://user-images.githubusercontent.com/4177727/46389776-f1d63780-c688-11e8-82ae-13d58d6f4738.png "Screenshot of MetagenomeScope's standard mode, showing a region of a biofilm assembly graph.")

MetagenomeScope is an interactive visualization tool designed for metagenomic
sequence assembly graphs. The tool aims to display a semi-linearized,
hierarchical overview of the input graph while emphasizing the
presence of certain structural patterns in the graph.

To this end, MetagenomeScope
highlights certain structural patterns of contigs in the graph,
splits the graph into its connected components (only displaying one connected
component at a time),
and uses [Graphviz](http://www.graphviz.org/)'
[`dot`](https://www.graphviz.org/pdf/dotguide.pdf) tool to hierarchically
lay out each connected component of the graph.

MetagenomeScope also contains a bunch of other features intended to simplify
exploratory analysis of assembly graphs, including tools for scaffold
visualization, path finishing, and (optionally)
[SPQR tree](https://en.wikipedia.org/wiki/SPQR_tree) decomposition of
biconnected components in the graph.

MetagenomeScope is composed of two main components:

1. The **preprocessing script** (contained in the `graph_collator/` directory of
   this repository), a mostly Python script that takes as input an assembly
   graph file and produces a SQLite .db file that can be visualized in the
   viewer interface. `collate.py` is the main script that needs to be run here.
   This preprocessing step takes care of structural pattern detection,
   graph layout, and (optionally) SPQR tree generation.
   - Currently, this supports LastGraph ([Velvet](https://www.ebi.ac.uk/~zerbino/velvet/)),
     GML ([MetaCarvel](https://github.com/marbl/MetaCarvel)), and
     [GFA](http://gfa-spec.github.io/GFA-spec/) input files.
     Support for SPAdes FASTG files should be ready very soon, as well.
   - If the `-spqr` option is passed to `collate.py`, it uses the C++ code in
     `spqr.cpp` to interface
     with [OGDF](http://www.ogdf.net/doku.php) to generate SPQR tree decompositions of
     biconnected components in the graph for MetagenomeScope's "decomposition
     mode." Since this requires some C++ code to be compiled, the use of `-spqr` in
     MetagenomeScope
     necessitates a few extra system requirements. See
     [this page](https://github.com/marbl/MetagenomeScope/wiki/Building-SPQR-Functionality-for-the-Preprocessing-Script)
     on MetagenomeScope's wiki for more information on building SPQR
     functionality for the preprocessing script.
   - See [this page](https://github.com/marbl/MetagenomeScope/wiki/System-Requirements)
     on MetagenomeScope's wiki for information on the system requirements for
     the preprocessing script.

2. The **viewer interface** (contained in the `viewer/` directory of this
   repository), a client-side web application that reads a .db file
   generated by `collate.py` and renders the resulting graph using
   [Cytoscape.js](http://js.cytoscape.org/).
   The viewer interface includes a "control panel" supporting various
   features for interacting with the graph.
   - Since MetagenomeScope's viewer interface is a client-side web application,
     you should be able to access it from most modern web browsers
     (mobile browsers also work, although using a desktop browser is generally
     recommended), either locally (if the viewer interface code is downloaded
     on your computer) or over HTTP/HTTPS (if the viewer interface code is
     hosted on a server).

The bifurcated nature of the tool lends it a few advantages that have proved
beneficial when analyzing large graphs:

- The user can save a .db file generated by the preprocessing script and
  visualize that file an arbitrary number of later times,
  without incurring the costs of layout, pattern detection, etc. twice
- The user can host the viewer interface and a number of .db files on
  a server, allowing many users to view graphs with the only costs incurred
  being those of rendering the graphs in question

## Demo

A demo of MetagenomeScope's viewer interface is available at
[mgsc.umiacs.io](http://mgsc.umiacs.io/).
You can use the "Demo .db file" button to load sample assembly graph files that are already hosted with the demo.

See [this page](https://github.com/marbl/MetagenomeScope/wiki/Customizing-Your-Own-Demo) on the wiki for instructions on customizing your own hosted version of MetagenomeScope's viewer interface.

## Wiki

Documentation on MetagenomeScope is available at its GitHub wiki,
located [here](https://github.com/marbl/MetagenomeScope/wiki).

## License

MetagenomeScope is licensed under the
[GNU GPL, version 3](https://www.gnu.org/copyleft/gpl.html).

License information for MetagenomeScope's dependencies is included in the root directory of this repository, in `DEPENDENCY_LICENSES.txt`. License copies for dependencies distributed/linked with MetagenomeScope -- when not included with their corresponding source code -- are available in the `dependency_licenses/` directory.

### A note about copyright years

The copyright years at the top of each of MetagenomeScope's code files are given as a hyphenated range (e.g. `20xx-20yy`) with the understanding that each year included in this range represents a "copyrightable year" in which a version of MetagenomeScope's code was publicly released on GitHub. (This note is included per the GPL guidelines [here](https://www.gnu.org/licenses/gpl-howto.en.html).)

## Acknowledgements

See the [acknowledgements page](https://github.com/marbl/MetagenomeScope/wiki/Acknowledgements) on the wiki for a full list of acknowledgements
in MetagenomeScope.

## Contact

MetagenomeScope was created by members of the [Pop Lab](https://sites.google.com/a/cs.umd.edu/poplab/) in the [Center for Bioinformatics and Computational Biology](https://cbcb.umd.edu/) at the [University of Maryland, College Park](https://umd.edu/).

Feel free to email `mfedarko (at) ucsd (dot) edu` with any questions, suggestions, comments, concerns, etc. regarding the tool. You can also open an [issue](https://github.com/marbl/MetagenomeScope/issues) in this repository, if you'd like.
