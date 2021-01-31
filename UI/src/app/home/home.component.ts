import {Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import * as go from 'gojs';
import {DiagramComponent} from 'gojs-angular';
import {HomeService} from "./home.service";
import {Quantity} from "../types";
import {TableLayout} from "../TableLayout";


@Component({
    selector: 'app-root',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit {

    @ViewChild('myDiagram', {static: true}) public myDiagramComponent: DiagramComponent;

    public diagramNodeData: Array<go.ObjectData> = [];
    public diagramLinkData: Array<go.ObjectData> = [];

    public diagramModelData = {prop: 'value'};

    quantities: Quantity[];
    quantitiesOptions: { [key: string]: string }[];
    arrangedByHorizontal: string;
    arrangedByVertical: string;
    colorSpecificFieldName: string;
    tableData: { [key: string]: string }[];
    columns: string[];
    that = this;

    public initDiagram(): go.Diagram {
      function TableCellLayout() {
        TableLayout.call(this);
        this._cellLayout = null;  // this is applied to each table cell's collection of Parts, if there is more than one
        //this.isOngoing= false;
      }
      go.Diagram.inherit(TableCellLayout, TableLayout);

      Object.defineProperty(TableCellLayout.prototype, "cellLayout", {
        get: function() { return this._cellLayout; },
        set: function(val) {
          if (val !== null && !(val instanceof go.Layout)) throw new Error("new TableCellLayout.cellLayout must be a Layout or null");
          if (val !== this._cellLayout) {
            this._cellLayout = val;
            this.invalidateLayout();
          }
        }
      });

      // don't have the cellLayout layout Parts for which this is true --
      // Parts that span cells
      TableCellLayout.prototype.isNotInCell = function(part) {
        return (part.rowSpan > 1 || part.columnSpan > 1);
      }

      TableCellLayout.prototype.beforeMeasure = function(parts, rowcol) {
        var lay = this.cellLayout;
        if (!lay) return;
        lay.diagram = this.diagram;
        var coll = new go.List();
        var bnds = new go.Rect();
        var tmp = new go.Rect();
        // for each row i ...
        for (var i = 0; i < rowcol.length; i++) {
          var rows = rowcol[i];
          if (!rows) continue;
          var rowDef = this.getRowDefinition(i);
          rowDef.originalMinimum = rowDef.minimum;
          rowDef.minimum = 0;
          for (var j = 0; j < rows.length; j++) {
            // for each column j in row i ...
            var parts = rows[j];
            if (!parts) continue;
            if (parts.length === 0) continue;
            // collect the Parts to be laid out within the cell
            coll.clear();
            for (var k = 0; k < parts.length; k++) {
              var part = parts[k];
              if (this.isNotInCell(part)) continue;
              coll.add(part);
              if (part instanceof go.Node) {
                // add Links that connect with another Node in this same cell
                part.findLinksConnected().each(function(link) {
                  if (!link.isLayoutPositioned) return;
                  var other = link.getOtherNode(part);
                  if (other && other.row === i && other.column === j && other.rowSpan === 1 && other.columnSpan === 1) {
                    coll.add(link);
                  }
                })
              }
            }
            if (coll.count === 0) continue;
            if (coll.count === 1) {
              //@ts-ignore
              coll.first().alignment = go.Spot.Default;
              continue;
            }
            lay.doLayout(coll);  // do the layout of just this cell's Parts
            // determine the area occupied by the laid-out parts
            bnds.setTo(0, 0, 0, 0);
            var colDef = this.getColumnDefinition(j);
            colDef.originalMinimum = colDef.minimum;
            colDef.minimum = 0;
            //@ts-ignore
            for (var k = coll.iterator; k.next(); ) {
              //@ts-ignore
              var part = k.value;
              if (part instanceof go.Link) continue;
              tmp.set(part.actualBounds);
              tmp.addMargin(part.margin);
              if (!tmp.isReal()) continue;
              if (k === 0) {
                bnds.set(tmp);
              } else {
                bnds.unionRect(tmp);
              }
            }
            // now make sure the RowColDefinitions are expanded if needed
            rowDef.minimum = Math.max(rowDef.minimum, bnds.height);
            colDef.minimum = Math.max(colDef.minimum, bnds.width);
            // and assign alignment on each of the Parts
            var mx = bnds.centerX;
            var my = bnds.centerY;
            //@ts-ignore
            for (var k = coll.iterator; k.next(); ) {
              //@ts-ignore
              var part = k.value;
              if (part instanceof go.Link) continue;
              part.alignment = new go.Spot(0.5, 0.5, part.actualBounds.centerX - mx, part.actualBounds.centerY - my);
            }
          }
        }
      }

      TableCellLayout.prototype.afterArrange = function(parts, rowcol) {
        if (this.cellLayout) {
          // restore all RowColDefinition.minimum
          for (var i = 0; i < rowcol.length; i++) {
            var columns = rowcol[i];
            if (!columns) continue;
            var rowDef = this.getRowDefinition(i);
            if (typeof rowDef.originalMinimum === "number") rowDef.minimum = rowDef.originalMinimum;
            for (var j = 0; j < columns.length; j++) {
              var parts = columns[j];
              if (!parts) continue;
              if (parts.length <= 1) continue;  // don't bother laying out just one node in a cell
              var colDef = this.getColumnDefinition(j);
              if (typeof colDef.originalMinimum === "number") colDef.minimum = colDef.originalMinimum;
            }
          }
        }
        this.updateTableGrid();
      }

      TableCellLayout.prototype.updateTableGrid = function() {
        var lay = this;
        var part = null;
        lay.diagram.findLayer("Background").parts.each(function(p) { if (p.name === "TABLEGRID") part = p; });
        if (!part) return;
        var numcols = lay.columnCount;
        var numrows = lay.rowCount;
        var firstcolindex = 1;
        var firstrowindex = 1;
        var firstcoldef = lay.getColumnDefinition(firstcolindex);
        var firstrowdef = lay.getRowDefinition(firstrowindex);
        var lastcoldef = lay.getColumnDefinition(numcols-1);
        var lastrowdef = lay.getRowDefinition(numrows-1);
        // determine the extent of the grid
        var left = firstcoldef.position;
        var width = lastcoldef.position + lastcoldef.total - firstcoldef.position;
        var top = firstrowdef.position;
        var height = lastrowdef.position + lastrowdef.total - firstrowdef.position;
        var eltIdx = 0;
        var prevLine = part.elements.count > 0 ? part.elt(0) : new go.Shape();
        function nextLine(fig, w, h) {  // reuse any existing Shapes
          var shp = null;
          if (eltIdx < part.elements.count) {
            shp = part.elt(eltIdx++);
          } else {
            shp = prevLine.copy();
            eltIdx++;
            part.add(shp);
          }
          shp.figure = fig;
          shp.width = w;
          shp.height = h;
          return shp;
        }
        // set up the verticals
        for (var i = firstcolindex; i < numcols; i++) {
          var def = lay.getColumnDefinition(i);
          var shp = nextLine("LineV", 0, height);
          shp.position = new go.Point(def.position, top);
        }
        // final line on right side
        var shp = nextLine("LineV", 0, height);
        shp.position = new go.Point(lastcoldef.position + lastcoldef.total, top);
        // set up the horizontals
        for (var i = firstrowindex; i < numrows; i++) {
          var def = lay.getRowDefinition(i);
          var shp = nextLine("LineH", width, 0);
          shp.position = new go.Point(left, def.position);
        }
        // final line at bottom
        var shp = nextLine("LineH", width, 0);
        shp.position = new go.Point(left, lastrowdef.position + lastrowdef.total);
        // get rid of any unneeded shapes
        while (part.elements.count > eltIdx) part.removeAt(eltIdx);
      }

      const $ = go.GraphObject.make;

      const dia =
        $(go.Diagram,
          {
            layout:
        // @ts-ignore
              $(TableCellLayout,
                $(go.RowColumnDefinition, { row: 0, height: 50, minimum: 50, alignment: go.Spot.Bottom }),
                $(go.RowColumnDefinition, { column: 0, width: 100, minimum: 100, alignment: go.Spot.Right }),
                {
                  cellLayout: $(go.GridLayout, {wrappingColumn: 2, spacing: new go.Size(100, 100) })
                }
              ),
            "SelectionCopied": updateCells,  // reassign cell of each copied or moved node
            "SelectionMoved": updateCells,
            "animationManager.isInitial": true,
            "undoManager.isEnabled": true,
            "initialContentAlignment": go.Spot.Center,
            model: $(go.GraphLinksModel,
              {
                linkToPortIdProperty: 'toPort',
                linkFromPortIdProperty: 'fromPort',
                linkKeyProperty: 'key' // IMPORTANT! must be defined for merges and data sync when using GraphLinksModel
              }
            ),
          });

      function updateCells(e) {
        var lay = e.diagram.layout;
        e.subject.each(function(node) {
          if (node instanceof go.Node) {
            var c = lay.findColumnForDocumentX(node.location.x);
            node.column = Math.min(Math.max(1, c), lay.columnCount-1);  // not into first column
            var r = lay.findRowForDocumentY(node.location.y);
            node.row = Math.min(Math.max(1, r), lay.rowCount-1);  // not into first row
          }
        });
        lay.invalidateLayout();
      }

      // the background grid
      dia.add(
        $(go.Part,
          { name: "TABLEGRID", layerName: "Background",
            pickable: false, selectable: false,
            position: new go.Point(0, 0), isLayoutPositioned: false },
          // an archetype line:
          $(go.Shape, { fill: null, stroke: "blue", strokeDashArray: [3, 3] })
        ));

      // NODES TEMPLATES:
        var simpleNodeTemplate =
            $(go.Node, "Auto",
              { locationSpot: go.Spot.Center },
              {margin: 30 },  // assume uniform size and margin, all around
              new go.Binding("row").makeTwoWay(),
              new go.Binding("column", "col").makeTwoWay(),
              new go.Binding("alignment", "align", go.Spot.parse).makeTwoWay(go.Spot.stringify),
              new go.Binding("layerName", "isSelected", function(s) { return s ? "Foreground" : ""; }).ofObject(),
                {
                    //locationSpot: go.Spot.Center,
                    // when the user clicks on a Node, highlight all Links coming out of the node
                    // and all of the Nodes at the other ends of those Links.
                    click: function (e, node) {
                      //First, highlight row in the table:

                      //@ts-ignore
                      var index = node.key.slice(1);

                      //@ts-ignore
                      let row = document.querySelector(`#myTable .state-${+index}`);

                      //@ts-ignore
                      row.classList.add('highlight');

                      var diagram = node.diagram;
                      diagram.startTransaction("Click simple node");
                      diagram.clearHighlighteds();
                      // @ts-ignore
                      node.findLinksOutOf().each(function (l) {
                          HighLightLink(e, l);
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
                $(go.Shape, "Ellipse",new go.Binding("fill", "color"),
                    {
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

        var detailedNodeTemplate =
            $(go.Node, "Auto",
              { locationSpot: go.Spot.Center },
              { margin: 4 },  // assume uniform size and margin, all around
              new go.Binding("row").makeTwoWay(),
              new go.Binding("column", "col").makeTwoWay(),
              new go.Binding("alignment", "align", go.Spot.parse).makeTwoWay(go.Spot.stringify),
              new go.Binding("layerName", "isSelected", function(s) { return s ? "Foreground" : ""; }).ofObject(),
                {
                    //locationSpot: go.Spot.Center,
                    // when the user clicks on a Node, highlight all Links coming out of the node
                    // and all of the Nodes at the other ends of those Links.
                    click: function (e, node) {

                      //First, remove highlight row in the table:

                      //@ts-ignore
                      var index = node.key.slice(1);

                      //@ts-ignore
                      let row = document.querySelector(`#myTable .state-${+index}`);

                      //@ts-ignore
                      row.classList.remove('highlight');

                        var diagram = node.diagram;
                        diagram.startTransaction("Click Details node");
                        diagram.clearHighlighteds();
                        // @ts-ignore
                        node.findLinksOutOf().each(function (l) {
                          HighLightLink(e, l);
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
                        fill: $(go.Brush, "Linear", {0: "white", 1: "lightgreen"}),
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
                        new go.Binding("text", "Time")),
                    $(go.TextBlock, "Parameters: ",
                        {row: 2, column: 0}, {font: "bold 10pt sans-serif"}),
                    $(go.TextBlock,
                        {row: 2, column: 2},
                        new go.Binding("text", "parameters"))
                )
            );

        // for each of the node categories, specify which template to use
        dia.nodeTemplateMap.add("simple", simpleNodeTemplate);
        dia.nodeTemplateMap.add("detailed", detailedNodeTemplate);

        // for the default category, "", use the same template that Diagrams use by default;
        // this just shows the key value as a simple TextBlock
        dia.nodeTemplate = simpleNodeTemplate;

      function headerStyle() {  // shared style for header cell contents
        return [
          {
            row: 0, column: 0,
            pickable: false,
            selectable: false
          },
          $(go.TextBlock, { font: "bold 12pt sans-serif" },
            new go.Binding("text"))
        ];
      }

      dia.nodeTemplateMap.add("ColumnHeader",
        $(go.Node, headerStyle(),
          new go.Binding("column", "col")
        ));

      dia.nodeTemplateMap.add("RowHeader",
        $(go.Node, headerStyle(),
          new go.Binding("row")
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


      // LINKS TEMPLATES:
        var linkTemplateMap = new go.Map<string, go.Link>();

        var simpleLinkTemplate =
            $(go.Link, {toShortLength: 4, reshapable: true, resegmentable: false, routing: go.Link.AvoidsNodes},
              {click: showFullLink},

                $(go.Shape,
                    // when highlighted, draw as a thick red line
                    new go.Binding("stroke", "isHighlighted", function (h) {
                        return h ? "red" : "black";
                    }).ofObject(),
                    new go.Binding("strokeWidth", "isHighlighted", function (h) {
                        return h ? 3 : 1;
                    }).ofObject()),

              new go.Binding("fromEndSegmentLength", "curviness"),

              new go.Binding("toEndSegmentLength", "curviness"),

              $(go.Shape,  // the arrowhead, at the mid point of the link
                { toArrow: "OpenTriangle", segmentIndex: -Infinity }),

                $(go.Shape,
                    {toArrow: "Standard", strokeWidth: 0},
                    new go.Binding("fill", "isHighlighted", function (h) {
                        return h ? "red" : "black";
                    }).ofObject())
            );

        var detailsLinkTemplate =
            $(go.Link, {toShortLength: 1, reshapable: true, resegmentable: false, routing: go.Link.AvoidsNodes},

                $(go.Shape,
                    // when highlighted, draw as a thick red line
                    new go.Binding("stroke", "isHighlighted", function (h) {
                        return "green";
                    }).ofObject(),

                  new go.Binding("strokeWidth", "isHighlighted", function (h) {
                        return h ? 3 : 1;
                    }).ofObject()),

                $(go.Shape,
                    {toArrow: "Standard", strokeWidth: 0},
                    new go.Binding("fill", "isHighlighted", function (h) {
                      return "green";
                    }).ofObject()),

              new go.Binding("fromEndSegmentLength", "curviness"),
              new go.Binding("toEndSegmentLength", "curviness"),
                  $(go.Shape,  // the arrowhead, at the mid point of the link
                    { toArrow: "OpenTriangle", segmentIndex: -Infinity }),

                $(go.TextBlock, new go.Binding("text", "text"), {segmentOffset: new go.Point(0, -10)}),
            );

      var highLightLinkTemplate =
        $(go.Link, {toShortLength: 1, reshapable: true, resegmentable: false, routing: go.Link.AvoidsNodes},

          $(go.Shape,
            // when highlighted, draw as a thick red line
            new go.Binding("stroke", "isHighlighted", function (h) {
              return h ? "red" : "black";
            }).ofObject(),
            new go.Binding("strokeWidth", "isHighlighted", function (h) {
              return h ? 3 : 1;
            }).ofObject()),

          $(go.Shape,
            {toArrow: "Standard", strokeWidth: 0},
            new go.Binding("fill", "isHighlighted", function (h) {
              return h ? "red" : "black";
            }).ofObject()),

          new go.Binding("fromEndSegmentLength", "curviness"),
          new go.Binding("toEndSegmentLength", "curviness"),
          $(go.Shape,  // the arrowhead, at the mid point of the link
            { toArrow: "OpenTriangle", segmentIndex: -Infinity }),
        );

        linkTemplateMap.add("simple", simpleLinkTemplate);
        linkTemplateMap.add("detailed", detailsLinkTemplate);
        linkTemplateMap.add("highLight", highLightLinkTemplate);

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

        function showFullLink(e, obj) {
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

      function HighLightLink(e, obj) {
        var link = obj.part;
        if (link) {
          var diagram = link.diagram;
          diagram.startTransaction("changeCategory");
          var cat = diagram.model.getCategoryForLinkData(link.data);
          cat = "highLight";
          diagram.model.setCategoryForLinkData(link.data, cat);
          diagram.commitTransaction("changeCategory");
        }
      }

        return dia;
    }

    constructor(private apiService: HomeService) {
    }

    public ngAfterViewInit() {
    }

    ngOnInit(): void {
        this.getGraph();
        this.getQuantities();
        this.getTableData();
        this.getQuantitiesOptions();
    }

    private getGraph() {
        this.diagramNodeData = [];
        this.diagramLinkData = [];
        this.apiService.getGraph().subscribe(result => {
            this.diagramNodeData = result?.nodes ? result?.nodes : [];
            this.diagramLinkData = result?.edges ? result?.edges : [];
            this.arrangedByHorizontal = result?.arrange_by_horizontal;
            this.arrangedByVertical = result?.arrange_by_vertical;
            this.colorSpecificFieldName = result?.color_specific_field_name;
        }, error => {
            console.error(error)
        });
    }


    getQuantities() {
        this.apiService.getQuantities().subscribe((quantities: Quantity[]) => {
            this.quantities = quantities;
            this.columns = ['index', 'time', ...this.quantities.map((quantity: Quantity) => quantity.name)];
        });
    }

    getQuantitiesOptions() {
      this.apiService.getQuantitiesOptions().subscribe((quantitiesOptions:{[key: string]:string}[]) => {
        this.quantitiesOptions = quantitiesOptions;
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

  setSpecificMagnitude(name: string) {
    this.apiService.setSpecificMagnitude(name)
      .subscribe(() => {
        this.getGraph();
      });
  }

  goToLink(url: string){
    window.open(url, "_blank");
  }
}

