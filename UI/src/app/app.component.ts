import {ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import * as go from 'gojs';
import {DiagramComponent} from 'gojs-angular';
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

    public diagramNodeData: Array<go.ObjectData> = [];
    public diagramLinkData: Array<go.ObjectData> = [];
    public horizontal: boolean = true;

    public diagramModelData = {prop: 'value'};
    fileName: string;

    quantities: Quantity[];
    arrangedBy: string;
    tableData: { [key: string]: string }[];

    public initDiagram(): go.Diagram {
        // this controls whether the layout is horizontal and the layer bands are vertical, or vice-versa:
        let HORIZONTAL = this.horizontal;  // this constant parameter can only be set here, not dynamically

        // Perform a TreeLayout where the node's actual tree-layer is specified by the "band" property on the node data.
        // This implementation only works when angle == 0, but could be easily modified to support other angles.
        function BandedTreeLayout() {
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

        go.Diagram.inherit(BandedTreeLayout, go.TreeLayout);

        // Modify the standard LayoutNetwork by making children with the same "band" value as their
        // parents actually be children of the grandparent.
        BandedTreeLayout.prototype.makeNetwork = function (coll) {
            var net = go.TreeLayout.prototype.makeNetwork.call(this, coll);
            // add artificial root and link with all root vertexes
            var singles = [];
            for (var it = net.vertexes.iterator; it.next();) {
                var v = it.value;
                if (v.node && v.sourceEdges.count === 0) {
                    singles.push(v);
                }
            }
            if (singles.length > 0) {
                var dummyroot = net.createVertex();
                net.addVertex(dummyroot);
                singles.forEach(function (v) {
                    net.linkVertexes(dummyroot, v, null);
                });
            }
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
                if (!parent.node) continue;
                // Should this be recursively looking for grandchildren/greatgrandchildren that
                // have the same band as this parent node??  Assume that is NOT required.
                var parentband = parent.node.data.band;
                var edges = [];
                for (var eit = parent.destinationEdges; eit.next();) {
                    var edge = eit.value;
                    var child = edge.toVertex;
                    if (!child.node) continue;
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

        BandedTreeLayout.prototype.assignTreeVertexValues = function (v) {
            if (v.node && v.node.data && v.node.data.band) {
                v.originalLevel = v.level;  // remember tree assignment
                v.level = Math.max(v.level, v.node.data.band);  // shift down to meet band requirement
            }
        };

        BandedTreeLayout.prototype.commitLayers = function (layerRects, offset) {
            // for debugging:
            //for (var i = 0; i < layerRects.length; i++) {
            //  if (window.console) window.console.log(layerRects[i].toString());
            //}

            for (var it = this.network.vertexes.iterator; it.next();) {
                var v = it.value;
                var n = v.node;
                if (n && v.originalLevel) {
                    // the band specifies the horizontal position
                    var diff = n.data.band - v.originalLevel;
                    if (diff > 0) {
                        var pos = v.bounds.position;
                        // this assumes that the angle is zero: rightward growth
                        HORIZONTAL ? pos.x = layerRects[v.level].x : pos.y = layerRects[v.level].y;
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
                    if (!v.node) continue;
                    model.setDataProperty(v.node.data, "band", v.level);
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

        const $ = go.GraphObject.make;
        const dia = $(go.Diagram, {
            // @ts-ignore
            layout: $(BandedTreeLayout,  // custom layout is defined above
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
                            changeLinkCategory(e, l);
                            l.isHighlighted = true;
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

        var nodeDetailedTemplate =
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
                            changeLinkCategory(e, l);
                            l.isHighlighted = true;
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

        // for each of the node categories, specify which template to use
        dia.nodeTemplateMap.add("simple", nodeSimpleTemplate);
        dia.nodeTemplateMap.add("detailed", nodeDetailedTemplate);
        // for the default category, "", use the same template that Diagrams use by default;
        // this just shows the key value as a simple TextBlock
        dia.nodeTemplate = nodeSimpleTemplate;


        // when the user clicks on the background of the Diagram, remove all highlighting
        dia.click = function (e) {
            e.diagram.commit(function (d) {
                d.clearHighlighteds();
            }, "no highlighteds");
        };

        //Prevent deleting nodes from the graph!
        dia.undoManager.isEnabled = true;
        dia.model.isReadOnly = true;  // Disable adding or removing parts

        var linkTemplateMap = new go.Map<string, go.Link>();

        var simpleLinkTemplate =
            $(go.Link, {toShortLength: 4, reshapable: true, resegmentable: true, routing: go.Link.AvoidsNodes},

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
            $(go.Link, {toShortLength: 4, reshapable: true, resegmentable: true, routing: go.Link.AvoidsNodes},

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

        linkTemplateMap.add("simple", simpleLinkTemplate);
        linkTemplateMap.add("detailed", detailsLinkTemplate);
        dia.linkTemplateMap = linkTemplateMap;
        dia.linkTemplate = simpleLinkTemplate;

        // there should be a single object of this category;
        // it will be modified by BandedTreeLayout to display visual "bands"
        // dia.nodeTemplateMap.add("VerticalBands",
        //     $(go.Part, "Position",
        //         {
        //             isLayoutPositioned: false,  // but still in document bounds
        //             locationSpot: new go.Spot(0, 0, 0, 16),  // account for header height
        //             layerName: "Background",
        //             pickable: false,
        //             selectable: false,
        //             itemTemplate:
        //                 $(go.Panel, HORIZONTAL? "Vertical" : "Horizontal",
        //                     new go.Binding("opacity", "visible", function(v) { return v ? 1 : 0; }),
        //                     new go.Binding("position", "bounds", function(b) { return b.position; }),
        //                     $(go.TextBlock,
        //                         {
        //                             stretch: HORIZONTAL? go.GraphObject.Horizontal : go.GraphObject.Vertical,
        //                             textAlign: "center",
        //                             wrap: go.TextBlock.None,
        //                             font: "bold 11pt sans-serif",
        //                             background: $(go.Brush, go.Brush.Linear, { 0: "lightgray", 1: "whitesmoke" })
        //                         },
        //                         new go.Binding("text"),
        //                         new go.Binding("width", "bounds", function(r) { return r.width; })),
        //                     // for separator lines:
        //                     //$(go.Shape, "LineV",
        //                     //  { stroke: "gray", alignment: go.Spot.Left, width: 1 },
        //                     //  new go.Binding("height", "bounds", function(r) { return r.height; }),
        //                     //  new go.Binding("visible", "itemIndex", function(i) { return i > 0; }).ofObject()),
        //                     // for rectangular bands:
        //                     $(go.Shape,
        //                         { stroke: null, strokeWidth: 0 },
        //                         new go.Binding("desiredSize", "bounds", function(r) { return r.size; }),
        //                         new go.Binding("fill", "itemIndex", function(i) { return i % 2 == 0 ? "white" : "whitesmoke"; }).ofObject())
        //                 )
        //         },
        //         new go.Binding("itemArray")
        //     ));

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
                            new go.Binding("opacity", "visible", function (v) {
                                return v ? 1 : 0;
                            }),
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

    constructor(private cdr: ChangeDetectorRef, private apiService: ApiService) {
    }

    public ngAfterViewInit() {
    }

    ngOnInit(): void {
        this.getGraph();
        this.getQuantities();
        this.getTableData();
    }

    private getGraph() {
        this.diagramNodeData = [];
        this.diagramLinkData = [];
        this.apiService.getGraph().subscribe(result => {
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

    getTableData() {
        this.apiService.getTableData().subscribe((tableData:{[key: string]:string}[]) => {
            this.tableData = tableData;
        });
    }

    postArrange(name: string) {
        this.apiService.postArrange(name)
            .subscribe(() => {
                this.getGraph();
            });
    }


    postPlot(name: string) {
        this.apiService.postPlot(name)
            .pipe(switchMap(() => {
                return this.apiService.getGraph()
            }))
            .subscribe((result) => {
                this.diagramNodeData = result?.nodes ? result?.nodes : [];
                this.diagramLinkData = result?.edges ? result?.edges : [];
                this.horizontal = result?.is_horizontal;
            });
    }


    //c://fakepath//a.txt
    fileUpload() {
        console.log((document.getElementById('file-uploader') as any).files[0].name);
    }
}

