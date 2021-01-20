import {ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import * as go from 'gojs';
import {DiagramComponent} from 'gojs-angular';
import {Quantity} from "../types";
import {PlotBService} from "./plot-b.service";


@Component({
  selector: 'app-root',
  templateUrl: './plot-b.component.html',
  styleUrls: ['./plot-b.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class PlotBComponent implements OnInit {

  @ViewChild('myDiagram', {static: true}) public myDiagramComponent: DiagramComponent;

  public diagramNodeData: Array<go.ObjectData> = [];
  public diagramLinkData: Array<go.ObjectData> = [];
  public horizontal: boolean = true;

  public diagramModelData = {prop: 'value'};
  fileName: string;

  quantities: Quantity[];
  quantitiesOptions: { [key: string]: string }[];
  arrangedByHorizontal: string;
  arrangedByVertical: string;
  colorSpecificFieldValue: string;
  colorSpecificFieldName: string;
  tableData: { [key: string]: string }[];
  columns: string[];

  public initDiagram(): go.Diagram {
    const $ = go.GraphObject.make;

    const dia =
      $(go.Diagram,
        {
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

    var nodeSimpleTemplate =
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
        $(go.Shape, "Ellipse",
          {
            fill: $(go.Brush, "Linear", {0: "white", 1: "red"}),
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

    var nodeSimpleTemplate =
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
            var diagram = node.diagram;
            diagram.startTransaction("Click SimpleLighted node");
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
            changeNodeLightedCategory(e, node);
            diagram.commitTransaction("Click SimpleLighted node");
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
            new go.Binding("text", "key"))
        ));

    dia.nodeTemplate = nodeSimpleTemplate;
    // define a simple Node template
    dia.nodeTemplate =
      $(go.Node, "Auto",  // the Shape will go around the TextBlock
        $(go.Shape, "RoundedRectangle", { strokeWidth: 0, fill: "white" },
          // Shape.fill is bound to Node.data.color
          new go.Binding("fill", "color")),
        $(go.TextBlock,
          { margin: 8, font: "bold 14px sans-serif", stroke: '#333' }, // Specify a margin to add some room around the text
          // TextBlock.text is bound to Node.data.key
          new go.Binding("text", "key"))
      );

    //Prevent deleting nodes from the graph!
    dia.undoManager.isEnabled = true;
    dia.model.isReadOnly = true;  // Disable adding or removing parts

    var linkTemplateMap = new go.Map<string, go.Link>();

    var simpleLinkTemplate =
      $(go.Link, {toShortLength: 4, reshapable: true, resegmentable: false, routing: go.Link.AvoidsNodes},
        {click: showFullLink},

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
        new go.Binding("fromEndSegmentLength", "curviness"),
        new go.Binding("toEndSegmentLength", "curviness"),
        $(go.Shape,  // the arrowhead, at the mid point of the link
          { toArrow: "OpenTriangle", segmentIndex: -Infinity }),

        $(go.Shape,
          {toArrow: "Standard", strokeWidth: 0},
          new go.Binding("fill", "isHighlighted", function (h) {
            return h ? "red" : "black";
          })
            .ofObject())
      );

    var detailsLinkTemplate =
      $(go.Link, {toShortLength: 1, reshapable: true, resegmentable: false, routing: go.Link.AvoidsNodes},

        $(go.Shape,
          // when highlighted, draw as a thick red line
          new go.Binding("stroke", "isHighlighted", function (h) {
            return "green";
          })
            .ofObject(),
          new go.Binding("strokeWidth", "isHighlighted", function (h) {
            return h ? 3 : 1;
          })
            .ofObject()),

        $(go.Shape,
          {toArrow: "Standard", strokeWidth: 0},
          new go.Binding("fill", "isHighlighted", function (h) {
            return "green";
          })
            .ofObject()),

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
            .ofObject()),

        new go.Binding("fromEndSegmentLength", "curviness"),
        new go.Binding("toEndSegmentLength", "curviness"),
        $(go.Shape,  // the arrowhead, at the mid point of the link
          { toArrow: "OpenTriangle", segmentIndex: -Infinity }),
      );

    linkTemplateMap.add("simple", simpleLinkTemplate);
    linkTemplateMap.add("detailed", detailsLinkTemplate);
    linkTemplateMap.add("highLight", highLightLinkTemplate);
    dia.linkTemplateMap = linkTemplateMap;
    // dia.linkTemplate = simpleLinkTemplate;

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

    function changeNodeLightedCategory(e, obj) {
      var node = obj.part;
      if (node) {
        var diagram = node.diagram;
        diagram.startTransaction("changeCategory");
        var cat = diagram.model.getCategoryForNodeData(node.data);
        if (cat === "simpleLighted")
          cat = "detailedLighted";
        else
          cat = "simpleLighted";
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

  constructor(private cdr: ChangeDetectorRef, private plotBService: PlotBService) {
  }

  public ngAfterViewInit() {
  }

  ngOnInit(): void {
    this.getGraph();
  }

  private getGraph() {
    this.diagramNodeData = [];
    this.diagramLinkData = [];
    this.plotBService.getGraph().subscribe(result => {
      this.diagramNodeData = result?.nodes ? result?.nodes : [];
      this.diagramLinkData = result?.edges ? result?.edges : [];
      this.arrangedByHorizontal = result?.arrange_by_horizontal;
      this.arrangedByVertical = result?.arrange_by_vertical;
      this.colorSpecificFieldValue = result?.color_specific_field_value;
      this.colorSpecificFieldName = result?.color_specific_field_name;
    }, error => {
      console.error(error)
    });
  }
}

