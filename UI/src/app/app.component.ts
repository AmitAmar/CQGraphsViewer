import {ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import * as go from 'gojs';
import {TableLayout} from './TableLayout'
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
    arrangedByHorizontal: string;
    arrangedByVertical: string;
    tableData: { [key: string]: string }[];

    public initDiagram(): go.Diagram {
        // define a custom ResizingTool to limit how far one can shrink a row or column
        function LaneResizingTool() {
            go.ResizingTool.call(this);
        }
        go.Diagram.inherit(LaneResizingTool, go.ResizingTool);

        LaneResizingTool.prototype.computeMinSize = function() {
            var diagram = this.diagram;
            var lane = this.adornedObject.part;  // might be row or column
            var horiz = (lane.rowSpan >= 9999);  // column header
            var margin = diagram.nodeTemplate.margin;
            var bounds = new go.Rect();
            diagram.findTopLevelGroups().each(function(g) {
                if (horiz ? (g.column === lane.column) : (g.row === lane.row)) {
                    var b = diagram.computePartsBounds(g.memberParts);
                    if (b.isEmpty()) return;  // nothing in there?  ignore it
                    b.unionPoint(g.location);  // keep any empty space on the left and top
                    b.addMargin(margin);  // assume the same node margin applies to all nodes
                    if (bounds.isEmpty()) {
                        bounds = b;
                    } else {
                        bounds.unionRect(b);
                    }
                }
            });

            // limit the result by the standard value of computeMinSize
            var msz = go.ResizingTool.prototype.computeMinSize.call(this);
            if (bounds.isEmpty()) return msz;
            return new go.Size(Math.max(msz.width, bounds.width), Math.max(msz.height, bounds.height));
        };

        LaneResizingTool.prototype.resize = function(newr) {
            var lane = this.adornedObject.part;
            var horiz = (lane.rowSpan >= 9999);
            var lay = this.diagram.layout;  // the TableLayout
            if (horiz) {
                var col = lane.column;
                var coldef = lay.getColumnDefinition(col);
                coldef.width = newr.width;
            } else {
                var row = lane.row;
                var rowdef = lay.getRowDefinition(row);
                rowdef.height = newr.height;
            }
            lay.invalidateLayout();
        };
        // end LaneResizingTool class

        function AlignmentDraggingTool() {
            go.DraggingTool.call(this);
        }
        go.Diagram.inherit(AlignmentDraggingTool, go.DraggingTool);

        AlignmentDraggingTool.prototype.moveParts = function(parts, offset, check) {
            go.DraggingTool.prototype.moveParts.call(this, parts, offset, check);
            var tool = this;
            parts.iteratorKeys.each(function(part) {
                if (part instanceof go.Link) return;
                var col = part.column;
                var row = part.row;
                if (typeof col === "number" && typeof row === "number") {
                    var b = computeCellBounds(col, row);
                    part.alignment = new go.Spot(0.5, 0.5, b.centerX, b.centerY);  // offset from center of cell
                }
            })
        }
        // end AlignmentDraggingTool

        // Utility functions, assuming the Diagram.layout is a TableLayout,
        // and that the rows and columns are implemented as Groups

        function computeCellBounds(col, row) {  // this is only valid after a layout
            //@ts-ignore
            var coldef = dia.layout.getColumnDefinition(col);
            //@ts-ignore
            var rowdef = dia.layout.getRowDefinition(row);
            return new go.Rect(coldef.position, rowdef.position, coldef.total, rowdef.total);
        }

        function findColumnGroup(col) {
            var it = dia.findTopLevelGroups();
            while (it.next()) {
                var g = it.value;
                if (g.column === col && g.rowSpan >= 9999) return g;
            }
            return null;
        }

        function findRowGroup(row) {
            var it = dia.findTopLevelGroups();
            while (it.next()) {
                var g = it.value;
                if (g.row === row && g.columnSpan >= 9999) return g;
            }
            return null;
        }

        function mouseEventHandlers() {  // standard mouse drag-and-drop event handlers
            return {
                mouseDragEnter: function(e) { mouseInCell(e, true); },
                mouseDragLeave: function(e) { mouseInCell(e, false); },
                mouseDrop: function(e) { mouseDropInCell(e, e.diagram.selection); }
            };
        }

        function mouseInCell(e, highlight) {
            e.diagram.clearHighlighteds();

            var col = e.diagram.layout.findColumnForDocumentX(e.documentPoint.x);
            if (col < 1) col = 1;  // disallow dropping in headers
            var g = findColumnGroup(col);
            if (g !== null) g.isHighlighted = highlight;

            var row = e.diagram.layout.findRowForDocumentY(e.documentPoint.y);
            if (row < 1) row = 1;
            g = findRowGroup(row);
            if (g !== null) g.isHighlighted = highlight;
        }

        function mouseDropInCell(e, coll) {
            var col = e.diagram.layout.findColumnForDocumentX(e.documentPoint.x);
            if (col < 1) col = 1;  // disallow dropping in headers
            var row = e.diagram.layout.findRowForDocumentY(e.documentPoint.y);
            if (row < 1) row = 1;
            coll.each(function(node) {
                if (node instanceof go.Node) {
                    node.column = col;
                    node.row = row;
                    // adjust the alignment to the new cell's center point
                    var cb = computeCellBounds(col, row);
                    var ab = node.actualBounds.copy();
                    //@ts-ignore
                    if (ab.right > cb.right-node.margin.right) ab.x -= (ab.right - cb.right + node.margin.right);
                    //@ts-ignore
                    if (ab.left < cb.left+node.margin.left) ab.x = cb.left + node.margin.left;
                    //@ts-ignore
                    if (ab.bottom > cb.bottom-node.margin.bottom) ab.y -= (ab.bottom - cb.bottom + node.margin.bottom);
                    //@ts-ignore
                    if (ab.top < cb.top+node.margin.top) ab.y = cb.top + node.margin.top;
                    var off = ab.center.subtract(cb.center);
                    node.alignment = new go.Spot(0.5, 0.5, off.x, off.y);
                }
            });
            dia.layoutDiagram(true);
        }

        const $ = go.GraphObject.make;
        const dia = $(go.Diagram, {
            layout: $(TableLayout,
                $(go.RowColumnDefinition, { row: 0, height: 50, minimum: 50 }),
                $(go.RowColumnDefinition, { column: 0, width: 100, minimum: 100 })
            ),
            'initialContentAlignment': go.Spot.Center,
            'undoManager.isEnabled': true,
            resizingTool: new LaneResizingTool(),
            model: $(go.GraphLinksModel,
                {
                    linkToPortIdProperty: 'toPort',
                    linkFromPortIdProperty: 'fromPort',
                    linkKeyProperty: 'key' // IMPORTANT! must be defined for merges and data sync when using GraphLinksModel
                }
            ),

        });

        var nodeSimpleTemplate =
            $(go.Node, "Auto",mouseEventHandlers(),
                new go.Binding("row").makeTwoWay(),
                new go.Binding("column", "col").makeTwoWay(),
                new go.Binding("alignment", "align", go.Spot.parse).makeTwoWay(go.Spot.stringify),
                new go.Binding("layerName", "isSelected", function(s) { return s ? "Foreground" : ""; }).ofObject(),
                {
                    //locationSpot: go.Spot.Center,
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
            $(go.Node, "Auto",mouseEventHandlers(),
                new go.Binding("row").makeTwoWay(),
                new go.Binding("column", "col").makeTwoWay(),
                new go.Binding("alignment", "align", go.Spot.parse).makeTwoWay(go.Spot.stringify),
                new go.Binding("layerName", "isSelected", function(s) { return s ? "Foreground" : ""; }).ofObject(),
                {
                    //locationSpot: go.Spot.Center,
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

        function groupStyle() {  // shared style for column groups and row groups
            return [
                mouseEventHandlers(),
                {
                    layerName: "Background",
                    stretch: go.GraphObject.Fill,
                    alignment: go.Spot.TopLeft,
                    minSize: new go.Size(110, 60),
                    movable: false,
                    copyable: false,
                    deletable: false,
                    resizable: true,
                    handlesDragDropForMembers: true
                },
                new go.Binding("width", "width").makeTwoWay(),
                new go.Binding("height", "height").makeTwoWay(),
                $(go.Shape,
                    { fill: "transparent", stretch: go.GraphObject.Fill },
                    new go.Binding("fill", "isHighlighted", function(h) { return h ? "rgba(0,255,0,0.15)" : "transparent"; }).ofObject())
            ];
        }

        dia.groupTemplateMap.add("Column",
            $(go.Group, groupStyle(),
                new go.Binding("column", "col"),
                {
                    row: 0,
                    rowSpan: 9999,
                  //avoidable:false,
                  resizeAdornmentTemplate:
                        $(go.Adornment, "Spot",
                            $(go.Placeholder),
                            $(go.Shape,  // for changing the width of a column
                                {
                                    alignment: new go.Spot(1, 0.0001), alignmentFocus: go.Spot.Top,
                                    desiredSize: new go.Size(7, 50),
                                    fill: "lightblue", stroke: "dodgerblue",
                                    cursor: "col-resize"
                                })
                        )
                }
            ));

        dia.groupTemplateMap.add("Row",
            $(go.Group, groupStyle(),
                new go.Binding("row"),
                {
                    column: 0,
                    columnSpan: 9999,
                  //avoidable:false,
                    resizeAdornmentTemplate:
                        $(go.Adornment, "Spot",
                            $(go.Placeholder),
                            $(go.Shape,  // for changing the height of a row
                                {
                                    alignment: new go.Spot(0.0001, 1), alignmentFocus: go.Spot.Left,
                                    desiredSize: new go.Size(100, 7),
                                    fill: "lightblue", stroke: "dodgerblue",
                                    cursor: "row-resize"
                                })
                        )
                }
            ));


        function headerStyle() {  // shared style for header cell contents
            return [
                {
                    pickable: false,
                    selectable: false,
                    alignment: go.Spot.Center
                },
                $(go.TextBlock, { font: "bold 12pt sans-serif" },
                    new go.Binding("text"))
            ];
        }

        dia.nodeTemplateMap.add("ColumnHeader",
            $(go.Node, headerStyle(),
                new go.Binding("column", "col"),
                { row: 0 }
            ));

        dia.nodeTemplateMap.add("RowHeader",
            $(go.Node, headerStyle(),
                new go.Binding("row"),
                { column: 0 }
            ));


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
            $(go.Link, {toShortLength: 4, reshapable: true, resegmentable: false, routing: go.Link.AvoidsNodes},

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
            $(go.Link, {toShortLength: 4, reshapable: true, resegmentable: false, routing: go.Link.AvoidsNodes},

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
            this.arrangedByHorizontal = result?.arrange_by_horizontal;
            this.arrangedByVertical = result?.arrange_by_vertical;
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
            });
    }


    //c://fakepath//a.txt
    fileUpload() {
        console.log((document.getElementById('file-uploader') as any).files[0].name);
    }
}

