import {ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import * as go from 'gojs';
import {DataSyncService, DiagramComponent} from 'gojs-angular';
import * as _ from 'lodash';
import {ApiService} from "./api.service";
import {Quantity} from "./types";
import {switchMap} from "rxjs/operators";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {

    @ViewChild('myDiagram', {static: true}) public myDiagramComponent: DiagramComponent;

    quantities: Quantity[];


    // initialize diagram / templates
    arrangedBy: string;

    public initDiagram(): go.Diagram {
        // this controls whether the layout is horizontal and the layer bands are vertical, or vice-versa:
        let HORIZONTAL = this.horizontal;  // this constant parameter can only be set here, not dynamically

        // Perform a TreeLayout where commitLayers is overridden to modify the background Part whose key is "_BANDS".
        function LayeredTreeLayout() {
            go.TreeLayout.call(this);

            this.treeStyle = go.TreeLayout.StyleLayered;  // required
            // new in GoJS v1.4
            this.layerStyle = go.TreeLayout.LayerUniform;

            // don't move subtrees closer together, to maintain possible empty spaces between layers
            this.compaction = go.TreeLayout.CompactionNone;
            // move the parent node towards the top of its subtree area
            this.alignment = go.TreeLayout.AlignmentStart;

            // sort a parent's child vertexes by the value of the index property
            function compareIndexes(v, w) {
                var vidx = v.index;
                if (vidx === undefined) vidx = 0;
                var widx = w.index;
                if (widx === undefined) widx = 0;
                return vidx - widx;
            }

            this.sorting = go.TreeLayout.SortingAscending;
            this.comparer = compareIndexes;

            //this.setsPortSpot = false;
            this.setsChildPortSpot = false;
        }

        go.Diagram.inherit(LayeredTreeLayout, go.TreeLayout);

        // Modify the standard LayoutNetwork by making children with the same "band" value as their
        // parents actually be children of the grandparent.
        LayeredTreeLayout.prototype.makeNetwork = function (coll) {
            var net = go.TreeLayout.prototype.makeNetwork.call(this, coll);
            // annotate every child with an index, used for sorting
            for (var it = net.vertexes.iterator; it.next();) {
                var parent = it.value;
                var idx = 0;
                for (var cit = parent.destinationVertexes; cit.next();) {
                    var child = cit.value;
                    child.index = idx;
                    idx += 10000;
                }
            }
            // now look for children with the same band value as their parent
            for (var it = net.vertexes.iterator; it.next();) {
                var parent = it.value;
                // Should this be recursively looking for grandchildren/greatgrandchildren that
                // have the same band as this parent node??  Assume that is NOT required.
                var parentband = parent.node.data.band;
                var edges = [];
                for (var eit = parent.destinationEdges; eit.next();) {
                    var edge = eit.value;
                    var child = edge.toVertex;
                    var childband = child.node.data.band;
                    if (childband <= parentband) edges.push(edge);
                }
                // for each LayoutEdge that connects the parent vertex with a child vertex
                // whose node has the same band #, reconnect the edge with the parent's parent vertex
                var grandparent = parent.sourceVertexes.first();
                if (grandparent !== null) {
                    var cidx = 1;
                    for (var i = 0; i < edges.length; i++) {
                        var e = edges[i];
                        parent.deleteDestinationEdge(e);
                        e.fromVertex = grandparent;
                        grandparent.addDestinationEdge(e);
                        var child = e.toVertex;
                        child.index = parent.index + cidx;
                        cidx++;
                    }
                }
            }
            return net;
        };

        LayeredTreeLayout.prototype.assignTreeVertexValues = function (v) {
            if (v.node && v.node.data && v.node.data.band) {
                v.originalLevel = v.level;  // remember tree assignment
                v.level = Math.max(v.level, v.node.data.band);  // shift down to meet band requirement
            }
        };

        LayeredTreeLayout.prototype.commitLayers = function (layerRects, offset) {
            for (var it = this.network.vertexes.iterator; it.next();) {
                var v = it.value;
                var n = v.node;
                if (n && v.originalLevel) {
                    // the band specifies the horizontal position
                    var diff = n.data.band - v.originalLevel;
                    if (diff > 0) {
                        var pos = v.bounds.position;
                        // this assumes that the angle is zero: rightward growth
                        pos.x = layerRects[v.level].x;
                        n.move(pos);
                    }
                }
            }

            // update the background object holding the visual "bands"
            var bands = this.diagram.findPartForKey("_BANDS");
            if (bands) {
                bands.layerRects = layerRects;  // remember the Array of Rect

                var model = this.diagram.model;
                for (var it = this.network.vertexes.iterator; it.next();) {
                    var v = it.value;
                    model.setDataProperty(v.node.data, "level", v.level);
                }

                bands.location = this.arrangementOrigin.copy().add(offset);

                var arr = bands.data.itemArray;
                for (var i = 0; i < layerRects.length; i++) {
                    var itemdata = arr[i];
                    if (itemdata) {
                        model.setDataProperty(itemdata, "bounds", layerRects[i]);
                    }
                }
            }
        };

        // BandedTreeLayout.prototype.commitLayers = function(layerRects, offset) {
        //   // update the background object holding the visual "bands"
        //   var bands = this.diagram.findPartForKey("_BANDS");
        //   if (bands) {
        //     var model = this.diagram.model;
        //     bands.location = this.arrangementOrigin.copy().add(offset);
        //
        //     // make each band visible or not, depending on whether there is a layer for it
        //     for (var it = bands.elements; it.next();) {
        //       var idx = it.key;
        //       var elt = it.value;  // the item panel representing a band
        //       elt.visible = idx < layerRects.length;
        //     }
        //
        //     // set the bounds of each band via data binding of the "bounds" property
        //     var arr = bands.data.itemArray;
        //     for (var i = 0; i < layerRects.length; i++) {
        //       var itemdata = arr[i];
        //       if (itemdata) {
        //         model.setDataProperty(itemdata, "bounds", layerRects[i]);
        //       }
        //     }
        //   }
        // };
        // // end BandedTreeLayout

        const $ = go.GraphObject.make;
        const dia = $(go.Diagram, {
            // @ts-ignore
            layout: $(LayeredTreeLayout,  // custom layout is defined above
                {
                    angle: HORIZONTAL ? 0 : 90,
                    arrangement: HORIZONTAL ? go.TreeLayout.ArrangementVertical : go.TreeLayout.ArrangementHorizontal
                }),
            'initialContentAlignment': go.Spot.Center,
            'undoManager.isEnabled': true,
            model: $(go.GraphLinksModel,
                {
                    linkToPortIdProperty: 'toPort',
                    linkFromPortIdProperty: 'fromPort',
                    linkKeyProperty: 'key' // IMPORTANT! must be defined for merges and data sync when using GraphLinksModel
                }
            ),

        });

        dia.commandHandler.archetypeGroupData = {key: 'Group', isGroup: true};

        var nodeSimpleTemplate =
            $(go.Node, "Auto",
                {
                    locationSpot: go.Spot.Center,
                    // when the user clicks on a Node, highlight all Links coming out of the node
                    // and all of the Nodes at the other ends of those Links.
                    click: function (e, node) {
                        var diagram = node.diagram;
                        diagram.startTransaction("Click simple node");
                        diagram.clearHighlighteds();
                        // @ts-ignore
                        node.findLinksOutOf().each(function (l) {
                            if (l.category != 'dummy') {
                                changeLinkCategory(e, l);
                                l.isHighlighted = true;
                            }

                        });
                        // @ts-ignore
                        node.findNodesOutOf().each(function (n) {
                            n.isHighlighted = true;
                        });
                        changeNodeCategory(e, node);
                        diagram.commitTransaction("Click simple node");
                    }
                },
                $(go.Shape, "Ellipse",
                    {
                        fill: $(go.Brush, "Linear", {0: "white", 1: "lightblue"}),
                        stroke: "darkblue", strokeWidth: 2
                    }),
                $(go.Panel, "Table",
                    {defaultAlignment: go.Spot.Left, margin: 4},
                    $(go.RowColumnDefinition, {column: 1, width: 4}),
                    $(go.TextBlock,
                        {row: 0, column: 0, columnSpan: 3, alignment: go.Spot.Center},
                        {font: "bold 14pt sans-serif"},
                        new go.Binding("text", "key"))
                ));

        var nodeDetailstemplate =
            $(go.Node, "Auto",
                {
                    locationSpot: go.Spot.Center,
                    // when the user clicks on a Node, highlight all Links coming out of the node
                    // and all of the Nodes at the other ends of those Links.
                    click: function (e, node) {
                        var diagram = node.diagram;
                        diagram.startTransaction("Click Details node");
                        diagram.clearHighlighteds();
                        // @ts-ignore
                        node.findLinksOutOf().each(function (l) {
                            if (l.category != 'dummy') {
                                changeLinkCategory(e, l);
                                l.isHighlighted = true;
                            }
                        });
                        // @ts-ignore
                        node.findNodesOutOf().each(function (n) {
                            n.isHighlighted = true;
                        });
                        changeNodeCategory(e, node);
                        diagram.commitTransaction("Click Details node");
                    }
                },

                $(go.Shape, "Ellipse",
                    {
                        fill: $(go.Brush, "Linear", {0: "white", 1: "lightblue"}),
                        stroke: "darkblue", strokeWidth: 2
                    }),
                $(go.Panel, "Table",
                    {defaultAlignment: go.Spot.Left, margin: 4},
                    $(go.RowColumnDefinition, {column: 1, width: 4}),
                    $(go.TextBlock,
                        {row: 0, column: 0, columnSpan: 3, alignment: go.Spot.Center},
                        {font: "bold 14pt sans-serif"},
                        new go.Binding("text", "key")),
                    $(go.TextBlock, "Time: ",
                        {row: 1, column: 0}, {font: "bold 10pt sans-serif"}),
                    $(go.TextBlock,
                        {row: 1, column: 2},
                        new go.Binding("text", "time")),
                    $(go.TextBlock, "Parameters: ",
                        {row: 2, column: 0}, {font: "bold 10pt sans-serif"}),
                    $(go.TextBlock,
                        {row: 2, column: 2},
                        new go.Binding("text", "parameters"))
                )
            );

        // create the nodeTemplateMap, holding three node templates:
        var nodeTemplatemap = new go.Map<string, go.Node>(); // In TypeScript you could write: new go.Map<string, go.Node>();
        // for each of the node categories, specify which template to use
        nodeTemplatemap.add("simple", nodeSimpleTemplate);
        nodeTemplatemap.add("detailed", nodeDetailstemplate);
        // for the default category, "", use the same template that Diagrams use by default;
        // this just shows the key value as a simple TextBlock
        dia.nodeTemplate = nodeSimpleTemplate;
        dia.nodeTemplateMap = nodeTemplatemap;


        // when the user clicks on the background of the Diagram, remove all highlighting
        dia.click = function (e) {
            e.diagram.commit(function (d) {
                d.clearHighlighteds();
            }, "no highlighteds");
        };

        //Prevent deleting nodes from the graph!
        dia.undoManager.isEnabled = true;
        dia.model.isReadOnly = true;  // Disable adding or removing parts


        var linkTemplatemap = new go.Map<string, go.Link>();

        var dummyLinkTemplate = $(go.Link, {toShortLength: 0.01, reshapable: false, resegmentable: false});

        var simpleLinkTemplate =
            $(go.Link, {toShortLength: 4, reshapable: true, resegmentable: true},

                $(go.Shape,
                    // when highlighted, draw as a thick red line
                    new go.Binding("stroke", "isHighlighted", function (h) {
                        return h ? "red" : "black";
                    })
                        .ofObject(),
                    new go.Binding("strokeWidth", "isHighlighted", function (h) {
                        return h ? 3 : 1;
                    })
                        .ofObject()),

                $(go.Shape,
                    {toArrow: "Standard", strokeWidth: 0},
                    new go.Binding("fill", "isHighlighted", function (h) {
                        return h ? "red" : "black";
                    })
                        .ofObject())
            );

        var detailsLinkTemplate =
            $(go.Link, {toShortLength: 4, reshapable: true, resegmentable: true},

                $(go.Shape,
                    // when highlighted, draw as a thick red line
                    new go.Binding("stroke", "isHighlighted", function (h) {
                        return h ? "red" : "black";
                    })
                        .ofObject(),
                    new go.Binding("strokeWidth", "isHighlighted", function (h) {
                        return h ? 3 : 1;
                    })
                        .ofObject()),

                $(go.Shape,
                    {toArrow: "Standard", strokeWidth: 0},
                    new go.Binding("fill", "isHighlighted", function (h) {
                        return h ? "red" : "black";
                    })
                        .ofObject())
                ,
                $(go.TextBlock, new go.Binding("text", "text"), {segmentOffset: new go.Point(0, -10)}),
            );

        linkTemplatemap.add("simple", simpleLinkTemplate);
        linkTemplatemap.add("detailed", detailsLinkTemplate);
        linkTemplatemap.add("dummy", dummyLinkTemplate);
        dia.linkTemplateMap = linkTemplatemap;
        dia.linkTemplate = simpleLinkTemplate;

        dia.nodeTemplateMap.add("Bands",
            $(go.Part, "Position",
                new go.Binding("itemArray"),
                {
                    isLayoutPositioned: false,  // but still in document bounds
                    locationSpot: new go.Spot(0, 0, HORIZONTAL ? 0 : 16, HORIZONTAL ? 16 : 0),  // account for header height
                    layerName: "Background",
                    pickable: false,
                    selectable: false,
                    itemTemplate:
                        $(go.Panel, HORIZONTAL ? "Vertical" : "Horizontal",
                            new go.Binding("position", "bounds", function (b) {
                                return b.position;
                            }),
                            $(go.TextBlock,
                                {
                                    angle: HORIZONTAL ? 0 : 270,
                                    textAlign: "center",
                                    wrap: go.TextBlock.None,
                                    font: "bold 11pt sans-serif",
                                    background: $(go.Brush, "Linear", {0: "aqua", 1: go.Brush.darken("aqua")})
                                },
                                new go.Binding("text"),
                                // always bind "width" because the angle does the rotation
                                new go.Binding("width", "bounds", function (r) {
                                    return HORIZONTAL ? r.width : r.height;
                                })
                            ),
                            // option 1: rectangular bands:
                            $(go.Shape,
                                {stroke: null, strokeWidth: 0},
                                new go.Binding("desiredSize", "bounds", function (r) {
                                    return r.size;
                                }),
                                new go.Binding("fill", "itemIndex", function (i) {
                                    return i % 2 == 0 ? "whitesmoke" : go.Brush.darken("whitesmoke");
                                }).ofObject())
                            // option 2: separator lines:
                            //(HORIZONTAL
                            //  ? $(go.Shape, "LineV",
                            //      { stroke: "gray", alignment: go.Spot.TopLeft, width: 1 },
                            //      new go.Binding("height", "bounds", function(r) { return r.height; }),
                            //      new go.Binding("visible", "itemIndex", function(i) { return i > 0; }).ofObject())
                            //  : $(go.Shape, "LineH",
                            //      { stroke: "gray", alignment: go.Spot.TopLeft, height: 1 },
                            //      new go.Binding("width", "bounds", function(r) { return r.width; }),
                            //      new go.Binding("visible", "itemIndex", function(i) { return i > 0; }).ofObject())
                            //)
                        )
                }
            ));

        function changeNodeCategory(e, obj) {
            var node = obj.part;
            if (node) {
                var diagram = node.diagram;
                diagram.startTransaction("changeCategory");
                var cat = diagram.model.getCategoryForNodeData(node.data);
                if (cat === "simple")
                    cat = "detailed";
                else
                    cat = "simple";
                diagram.model.setCategoryForNodeData(node.data, cat);
                diagram.commitTransaction("changeCategory");
            }
        }

        function changeLinkCategory(e, obj) {
            var link = obj.part;
            if (link) {
                var diagram = link.diagram;
                diagram.startTransaction("changeCategory");
                var cat = diagram.model.getCategoryForLinkData(link.data);
                if (cat === "simple")
                    cat = "detailed";
                else
                    cat = "simple";
                diagram.model.setCategoryForLinkData(link.data, cat);
                diagram.commitTransaction("changeCategory");
            }
        }

        //dia.grid.visible = true;
        return dia;
    }

    public diagramNodeData: Array<go.ObjectData> = [];
    public diagramLinkData: Array<go.ObjectData> = [];
    public horizontal: boolean = true;

    public diagramModelData = {prop: 'value'};

    public skipsDiagramUpdate = false;
    showVar: boolean = true;

    // When the diagram model changes, update app data to reflect those changes
    public diagramModelChange = function (changes: go.IncrementalData) {
        // when setting state here, be sure to set skipsDiagramUpdate: true since GoJS already has this update
        // (since this is a GoJS model changed listener event function)
        // this way, we don't log an unneeded transaction in the Diagram's undoManager history
        this.skipsDiagramUpdate = true;

        //this.http.get(this.URL).subscribe((data:any) => {this.diagramNodeData = data;});
        //this.diagramNodeData = DataSyncService.syncNodeData(changes, this.diagramNodeData);
        //this.diagramLinkData = DataSyncService.syncLinkData(changes, this.diagramLinkData);
        //this.diagramModelData = DataSyncService.syncModelData(changes, this.diagramModelData);
    };

    //public diagramNodeData: Array<go.ObjectData>;

    constructor(private cdr: ChangeDetectorRef, private apiService: ApiService) {
    }

    public observedDiagram = null;

    // currently selected node; for inspector
    public selectedNode: go.Node | null = null;

    public ngAfterViewInit() {
        if (this.observedDiagram) return;
        //this.observedDiagram = this.myDiagramComponent.diagram;
        this.cdr.detectChanges(); // IMPORTANT: without this, Angular will throw ExpressionChangedAfterItHasBeenCheckedError (dev mode only)

        const appComp: AppComponent = this;
        // listener for inspector
        this.myDiagramComponent.diagram.addDiagramListener('ChangedSelection', function (e) {
            if (e.diagram.selection.count === 0) {
                appComp.selectedNode = null;
            }
            const node = e.diagram.selection.first();
            if (node instanceof go.Node) {
                appComp.selectedNode = node;
            } else {
                appComp.selectedNode = null;
            }
        });

    } // end ngAfterViewInit
    fileName: string;


    ngOnInit(): void {
        this.getNodeAndEdge();
    }

    private getNodeAndEdge() {
        this.diagramNodeData = [];
        this.diagramLinkData = [];
        this.apiService.getNodeAndEdge().subscribe(result => {
            this.diagramNodeData = result?.nodes ? result?.nodes : [];
            this.diagramLinkData = result?.edges ? result?.edges : [];
            this.horizontal = result?.is_horizontal;
            this.arrangedBy = result?.arrange_by;
        }, error => {
            console.error(error)
        });
    }


    getQuantities() {
        this.apiService.getQuantities().subscribe((quantities: Quantity[]) => {
            this.quantities = quantities;
        });
    }

    postArrange(name: string) {
        this.apiService.postArrange(name)
            .subscribe(() => {
                this.getNodeAndEdge();
            });
    }


    postPlot(name: string) {
        this.apiService.postPlot(name)
            .pipe(switchMap(() => {
                return this.apiService.getNodeAndEdge()
            }))
            .subscribe((result) => {
                this.diagramNodeData = result?.nodes ? result?.nodes : [];
                this.diagramLinkData = result?.edges ? result?.edges : [];
                this.horizontal = result?.is_horizontal;
            });
    }


    fileUpload() {
        console.log((document.getElementById('file-uploader') as any).files[0].name);
    }
}

