import {Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import * as go from 'gojs';
import {DiagramComponent} from 'gojs-angular';
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

  public diagramModelData = {prop: 'value'};

  public initDiagram(): go.Diagram {
    // This variation on ForceDirectedLayout does not move any selected Nodes
    // but does move all other nodes (vertexes).
    function ContinuousForceDirectedLayout() {
      go.ForceDirectedLayout.call(this);
      this._isObserving = false;
    }
    go.Diagram.inherit(ContinuousForceDirectedLayout, go.ForceDirectedLayout);

    ContinuousForceDirectedLayout.prototype.isFixed = function(v) {
      return v.node.isSelected;
    }

    // optimization: reuse the ForceDirectedNetwork rather than re-create it each time
    ContinuousForceDirectedLayout.prototype.doLayout = function(coll) {
      if (!this._isObserving) {
        this._isObserving = true;
        // caching the network means we need to recreate it if nodes or links have been added or removed or relinked,
        // so we need to track structural model changes to discard the saved network.
        var lay = this;
        this.diagram.addModelChangedListener(function(e) {
          // modelChanges include a few cases that we don't actually care about, such as
          // "nodeCategory" or "linkToPortId", but we'll go ahead and recreate the network anyway.
          // Also clear the network when replacing the model.
          if (e.modelChange !== "" ||
            (e.change === go.ChangedEvent.Transaction && e.propertyName === "StartingFirstTransaction")) {
            lay.network = null;
          }
        });
      }
      var net = this.network;
      if (net === null) {  // the first time, just create the network as normal
        this.network = net = this.makeNetwork(coll);
      } else {  // but on reuse we need to update the LayoutVertex.bounds for selected nodes
        this.diagram.nodes.each(function(n) {
          var v = net.findVertex(n);
          if (v !== null) v.bounds = n.actualBounds;
        });
      }
      // now perform the normal layout
      go.ForceDirectedLayout.prototype.doLayout.call(this, coll);
      // doLayout normally discards the LayoutNetwork by setting Layout.network to null;
      // here we remember it for next time
      this.network = net;
    }
    // end ContinuousForceDirectedLayout

    const $ = go.GraphObject.make;

    const dia =
      $(go.Diagram,
        {
          "animationManager.isInitial": true,
          "undoManager.isEnabled": true,
          "initialContentAlignment": go.Spot.Center,
          layout:
          // @ts-ignore
            $(ContinuousForceDirectedLayout,  // automatically spread nodes apart while dragging
              { defaultSpringLength: 80, defaultElectricalCharge: 150 }),

          model: $(go.GraphLinksModel,
            {
              linkToPortIdProperty: 'toPort',
              linkFromPortIdProperty: 'fromPort',
              linkKeyProperty: 'key' // IMPORTANT! must be defined for merges and data sync when using GraphLinksModel
            }
          ),
        });


    dia.nodeTemplate =
      $(go.Node, "Auto",  // the Shape will go around the TextBlock
        $(go.Shape, "RoundedRectangle", { strokeWidth: 0, fill: "white" },
          // Shape.fill is bound to Node.data.color
          new go.Binding("fill", "color")),
        $(go.TextBlock,
          { margin: 8, font: "bold 14px sans-serif", stroke: '#333' }, // Specify a margin to add some room around the text
          // TextBlock.text is bound to Node.data.key
          new go.Binding("text", "text"))
      );

    // Prevent deleting nodes from the graph!
    dia.undoManager.isEnabled = true;
    dia.model.isReadOnly = true;  // Disable adding or removing parts


    dia.linkTemplate =  $(go.Link, $(go.Shape,
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

    return dia;
  }

  constructor(private plotBService: PlotBService) {
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
    }, error => {
      console.error(error)
    });
  }
}

