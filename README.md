# AsmViz

(That's the tentative name for this, at least.)

An interactive visualization tool for genomic assembly graphs. The goal
of this, as compared with other visualization tools, is to show the
pertinent parts of a graph instead of just displaying the entire graph at once.

To this end, AsmViz highlights certain patterns of contigs in the graph
(bubbles, frayed ropes, chains, and "linear" cycles), splits graphs up by
connected components (optionally displaying only a certain maximum number of
components and/or only displaying components with a certain minimum number
of contigs), and uses [GraphViz](http://www.graphviz.org/) to lay out each
component.

AsmViz is composed of two main components:

1. `collate.py`, a Python script that reads an assembly graph file,
   identifies patterns in it, separates it by connected components, and
   runs GraphViz on each component to be laid out, generating a SQLite
   .db file containing layout, pattern, and biological information extracted
   from GraphViz and from the original assembly graph file.
   Currently, this supports LastGraph (Velvet), GraphML
   (Bambus 3 scaffolds), and GFA assembly graph files, and support for GFA2
   and FASTG (SPAdes) files is planned. Please note that, although
   GFA files only have DNA sequences as an optional requirement
   (it's possible to denote the DNA of a sequence with just an asterisk),
   including DNA sequences in GFA files is currently required.

2. `asmviz_viewer.html`, a HTML/Javascript webpage that reads a .db file
   generated by `collate.py` and renders the resulting graph in
   [Cytoscape.js](http://js.cytoscape.org/). This is coupled with an
   interface and "control panel" in which the graph can be searched,
   zoomed, panned, rotated, and fitted to the screen, nodes can be selected,
   and pattern-indicating groups of nodes can be collapsed (either on
   the level of individual nodes or for all node groups in the graph). The
   split nature of `collate.py` and `asmviz_viewer.html` here allows the
   user greater latitude:
    - The user can save the layout/pattern information in a .db file and
      view it at a later time, without incurring the layout and
      patttern detection costs twice
    - The user can host `asmviz_viewer.html` and a number of .db files on
      their server, allowing many users to view the assembly graphs without any
      of the costs associated with layout and pattern detection

## System Requirements

### collate.py

* Python 2.7, with the following standard library modules installed (all
  should be installed by default with Python 2.7):
    * [sys](https://docs.python.org/2/library/sys.html)
    * [subprocess](https://docs.python.org/2/library/subprocess.html)
    * [os](https://docs.python.org/2/library/os.html)
    * [errno](https://docs.python.org/2/library/errno.html)
    * [math](https://docs.python.org/2/library/math.html)
    * [sqlite3](https://docs.python.org/2/library/sqlite3.html)
    * [re](https://docs.python.org/2/library/re.html)
* GraphViz (with [dot](http://www.graphviz.org/Documentation/dotguide.pdf) program, which should be installed by default with GraphViz)

### asmviz\_viewer.html

* Any modern internet browser (smartphone/tablet mobile browsers should
  work, also) supported by Cytoscape.js

## Running collate.py

`collate.py` is located in the graph\_collator folder. It can be
run from the command line;
see the [system requirements](#system-requirements) section above
for information on what other software needs to be installed.

Running `collate.py` will process an assembly graph file so that
it can be visualized. The syntax for this is

`./collate.py -i (input file) -o (output file prefix)
    [-d (output directory name)] [-pg] [-px] [-w]`

The script will produce a directory containing the created .xdot/.gv files.
(If the directory already exists, it will just place the .xdot/.gv files in
that directory; however, unless `-w` is passed, this will throw an error
upon trying to overwrite any files in the directory.)

### Command-line argument descriptions

* `-i` The input assembly graph file to be used.
* `-o` The file prefix to be used for .db/.xdot/.gv files generated. These
  files will be formatted something like foobar\_1.gv, foobar\_1.xdot,
  foobar\_2.gv, foobar\_2.xdot, ... foobar.db for an argument of `foobar`
  to `-o`.
* `-d` This optional argument specifies the name of the directory in which
  .xdot/.gv output files will be stored. If no name is specified then the
  argument of `-o` will be used as the directory name (to be created or used
  in the current working directory; note, however,  that it's strongly
  recommended you explicitly specify an output directory using `-d` to ensure
  data is being stored in the intended location).
* `-nodna` This optional argument, if given, does not store the DNA
  sequences from contig assembly graph files in the output .db file. This
  option can help save a large amount of space in .db files making
  processing them in AsmViz viewer faster.
* `-pg` This optional argument preserves DOT files (suffix .gv) in the output
  directory; if this argument is not given, then all .gv files will just be
  deleted after they are used to create their corresponding .xdot file.
* `-px` This optional argument preserves .xdot files in the output
  directory; if this argument is not given, then all .xdot files will just be
  deleted after their layout information is parsed and stored in the .db
  file.
* `-w` This optional argument overwrites output files (.db/.xdot/.gv) in the
  output directory. If this argument is not given, then an error will be
  raised if writing an output file would cause another file in the output
  directory (if it already exists) to be overwritten.
    * Note that the presence of files in the
      output directory that are named as folders (e.g. a directory named
      `foobar.db` in the output directory) will cause an error to be raised
      regardless of whether or not `-w` is set.
    * Also note that, if the output folder is synced with Dropbox and the
      filesystem is case-sensitive, then the output folder should not
      contain any files with the same name as any of the output files but
      different case. If so, the files this script generates will
      automatically be renamed by your Dropbox daemon, and this will likely
      result in filename inconsistencies that cause the script to terminate.
      To solve this problem, it's recommended that your output directory not
      contain any files that might overlap with the specified output file
      names in this respect. (See
      [#26](https://github.com/fedarko/AsmViz/issues/26#issuecomment-237120787)
      for a thorough description of this problem.)

## Running asmviz\_viewer.html

Open `viewer/asmviz_viewer.html` in your favorite browser. Click
the "Choose File" button in the top-left corner of the screen and select
a database file generated by `collate.py` -- in the online demo, this is
done through a dialog of hosted .db files, and in the local demo, this is
done through a file upload of a .db file.

After that, the progress bar will change to indicate that the .db file is
being processed. Once the "Draw connected component," "Assembly info,"
and component selector elements are enabled (when they turn from gray to
white and become clickable), you can:

* Use the "Assembly info" button to view information about the .db file's
  assembly, if desired.
* Select a connected component to draw with the component selector. The
  range of acceptable values goes from 1 to the number of connected
  components in the assembly graph (which may also be 1), where 1 denotes
  the largest connected component in the assembly and smaller values indicate
  smaller (or equally-sized) connected components.
* Use the "Draw connected component" button to draw the selected component.
  The progress bar will periodically update to indicate the current status
  of the drawing process.

Once the progress bar is completely filled and the remaining UI elements
(with the exception of the "Selected node/edge info" button; see below) are
enabled, the graph is ready to be interacted with! An overview of the
available features:

* You can **zoom in/out** on the graph by scrolling up/down.
* You can **pan** the graph by clicking on the screen (not on a node or edge)
  and dragging the mouse in accordance with the desired direction of
  movement.
* You can **drag** nodes/node groups by clicking on them and dragging them
  with your mouse.
* You can **view information about the assembly graph and currently drawn
  connected component** by using the "Assembly info" button.
* You can **draw another connected component** by repeating the process
  detailed above (selecting the "size rank" of the component to draw using
  the component selector, and then pressing the "Draw connected component"
  button).
* You can **select multiple nodes, edges, and node groups** by holding down
  the SHIFT or CTRL keys and clicking on the element in question, or by
  holding down the SHIFT or CTRL keys while clicking and dragging the mouse
  to select a group of nodes or edges. Selected
  nodes/node groups can be moved around by dragging them, but note that
  selected edges cannot be moved independently of their source/sink nodes.
* Selecting nodes/edges will cause the "Selected node/edge info" button to
  be enabled, which you can use to **view information about currently selected
  nodes and edges**. If one or more nodes are selected and all of the selected
  nodes have DNA sequence information available (i.e. the current assembly
  graph's nodes are contigs, and `-nodna` was not used in collate.py), then
  the node/edge information dialog will contain two buttons that can be used to
  either copy the DNA sequences of all selected nodes (in FASTA format)
  to the clipboard or to export the DNA sequences directly to a FASTA file.
* You can **search for nodes, edges, or node groups** using the "Search"
  button. Note that edge IDs are (currently) given as
  `node1->node2`, where `node1` is the name of the source node and `node2`
  is the name of the sink (target) node.
* You can **scale** the graph to fit within the current window size using
  the "Fit Graph" button. This is done by default after rendering the graph
  for the first time, and done by default after rotating the graph.
* You can **rotate** the graph so that its nodes are laid out in the general
  direction indicated by using the "Graph Rotation" selection list.
  Selecting a different rotation than the current one will cause the entire
  graph to be rotated in that direction, followed by the graph being scaled
  to optimally fit within the current window size. Note that this preserves
  the state of the graph, so any collapsed/uncollapsed node groups, selected
  elements, or other modified properties of the graph will remain across
  rotations.
* You can **collapse and uncollapse individual node groups** by
  right-clicking on them; however, note that you have to right-click on
  the node group itself to do this, not on any of the nodes/edges within
  the node group. Collapsing a node group will convert any incoming/outgoing
  edges to that node group to straight-line Bezier edges, since no GraphViz
  data exists defining such an edge.
* You can **collapse and uncollapse all node groups in the graph** by using
  the "Collapse All Node Groups"/"Uncollapse All Node Groups" button located
  near the top-right corner of the screen. Individually-collapsed node
  groups will be ignored upon collapsing all nodes, and already-uncollapsed
  node groups will be ignored upon uncollapsing all nodes.
