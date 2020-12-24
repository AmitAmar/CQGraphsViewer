import {ChangeDetectorRef, Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import * as go from 'gojs';
import {DataSyncService, DiagramComponent} from 'gojs-angular';
import * as _ from 'lodash';
import {ApiService} from "./api.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {

  @ViewChild('myDiagram', {static: true}) public myDiagramComponent: DiagramComponent;

  // initialize diagram / templates
  public initDiagram(): go.Diagram {
    const $ = go.GraphObject.make;
    const dia = $(go.Diagram, {
      'initialContentAlignment': go.Spot.Center,
      'undoManager.isEnabled': true,
      model: $(go.GraphLinksModel,
        {
          linkToPortIdProperty: 'toPort',
          linkFromPortIdProperty: 'fromPort',
          linkKeyProperty: 'key' // IMPORTANT! must be defined for merges and data sync when using GraphLinksModel
        }
      )
    });

    dia.commandHandler.archetypeGroupData = {key: 'Group', isGroup: true};



    dia.nodeTemplate =
      $(go.Node, "Auto",
        {
          locationSpot: go.Spot.Center,
          // when the user clicks on a Node, highlight all Links coming out of the node
          // and all of the Nodes at the other ends of those Links.
          click: function(e, node) {
            var diagram = node.diagram;
            diagram.startTransaction("highlight");
            diagram.clearHighlighteds();
            // @ts-ignore
            node.findLinksOutOf().each(function(l) { l.isHighlighted = true; });
            // @ts-ignore
            node.findNodesOutOf().each(function(n) { n.isHighlighted = true; });
            diagram.commitTransaction("highlight");
          }
        },

        $(go.Shape,
          { fill: $(go.Brush, "Linear", { 0: "white", 1: "lightblue" }),
                    stroke: "darkblue", strokeWidth: 2 }),
        $(go.Panel, "Table",
          { defaultAlignment: go.Spot.Left, margin: 4 },
          $(go.RowColumnDefinition, { column: 1, width: 4 }),
          $(go.TextBlock,
            { row: 0, column: 0, columnSpan: 3, alignment: go.Spot.Center },
            { font: "bold 14pt sans-serif" },
            new go.Binding("text", "key")),
          $(go.TextBlock, "Time: ",
            { row: 1, column: 0 },{ font: "bold 10pt sans-serif" }),
          $(go.TextBlock,
            { row: 1, column: 2 },
            new go.Binding("text", "time")),
          $(go.TextBlock, "Parameters: ",
            { row: 2, column: 0 }, { font: "bold 10pt sans-serif" }),
          $(go.TextBlock,
            { row: 2, column: 2 },
            new go.Binding("text", "parameters"))
        ),
      );


    // when the user clicks on the background of the Diagram, remove all highlighting
    dia.click = function(e) {
      e.diagram.commit(function(d) { d.clearHighlighteds(); }, "no highlighteds");
    };

    //Prevent deleting nodes from the graph!
    dia.undoManager.isEnabled = true;
    dia.model.isReadOnly = true;  // Disable adding or removing parts



    // a function that produces the content of the diagram tooltip
    function diagramInfo(model) {
      return "Model:\n" + model.nodeDataArray.length + " nodes, " +
        model.linkDataArray.length + " links";
    }

    dia.linkTemplate =
      $(go.Link,{ toShortLength: 4, reshapable: true, resegmentable: true },

        $(go.Shape,
          // when highlighted, draw as a thick red line
          new go.Binding("stroke", "isHighlighted", function(h) { return h ? "red" : "black"; })
            .ofObject(),
          new go.Binding("strokeWidth", "isHighlighted", function(h) { return h ? 3 : 1; })
            .ofObject()),

        $(go.Shape,
          { toArrow: "Standard", strokeWidth: 0 },
          new go.Binding("fill", "isHighlighted", function(h) { return h ? "red" : "black"; })
            .ofObject())
      ,
        $(go.TextBlock, new go.Binding("text", "text"), {segmentOffset: new go.Point(0, -10)}),
      );

    dia.layout = $(go.TreeLayout);


    return dia;
  }

  public diagramNodeData: Array<go.ObjectData> = [];
  public diagramLinkData: Array<go.ObjectData> = [];

  public diagramModelData = {prop: 'value'};

  public skipsDiagramUpdate = false;

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
    this.observedDiagram = this.myDiagramComponent.diagram;
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


  public handleInspectorChange(newNodeData) {
    const key = newNodeData.key;
    // find the entry in nodeDataArray with this key, replace it with newNodeData
    let index = null;
    for (let i = 0; i < this.diagramNodeData.length; i++) {
      const entry = this.diagramNodeData[i];
      if (entry.key && entry.key === key) {
        index = i;
      }
    }

    if (index >= 0) {
      // here, we set skipsDiagramUpdate to false, since GoJS does not yet have this update
      this.skipsDiagramUpdate = false;
      this.diagramNodeData[index] = _.cloneDeep(newNodeData);
    }
  }

  ngOnInit(): void {
    this.apiService.getNodeAndEdge().subscribe(result => {
      this.diagramNodeData = result?.nodes ? result?.nodes : [];
      this.diagramLinkData = result?.edges ? result?.edges : [];
    }, error => {
      console.error(error)
    })
  }


}

