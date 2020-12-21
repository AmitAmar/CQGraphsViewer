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


    const makePort = function (id: string, spot: go.Spot) {
      return $(go.Shape, 'Circle',
        {
          opacity: .5,
          fill: 'gray', strokeWidth: 0, desiredSize: new go.Size(8, 8),
          portId: id, alignment: spot,
          fromLinkable: true, toLinkable: true
        }
      );
    }

    // define the Node template
    dia.nodeTemplate =
      $(go.Node, 'Spot',
        {
          contextMenu:
            $('ContextMenu',
              $('ContextMenuButton',
                $(go.TextBlock, 'Group'),
                {
                  click: function (e, obj) {
                    e.diagram.commandHandler.groupSelection();
                  }
                },
                new go.Binding('visible', '', function (o) {
                  return o.diagram.selection.count > 1;
                }).ofObject())
            )
        },
        $(go.Panel, 'Auto',
          $(go.Shape, 'RoundedRectangle', {stroke: null},
            new go.Binding('fill', 'color')
          ),
          $(go.TextBlock, {margin: 8},
            new go.Binding('text', 'key'))
        ),
        // Ports
        makePort('t', go.Spot.TopCenter),
        makePort('l', go.Spot.Left),
        makePort('r', go.Spot.Right),
        makePort('b', go.Spot.BottomCenter)
      );


    dia.linkTemplate =
      $(go.Link,
        $(go.Shape),                           // this is the link shape (the line)
        $(go.Shape, {toArrow: "Standard"}),  // this is an arrowhead
        $(go.TextBlock, new go.Binding("text", "text"), {segmentOffset: new go.Point(0, -10)}),
      );

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

  ngOnInit() : void {
    this.apiService.getNodeAndEdge().subscribe(result => {
      this.diagramNodeData = result?.nodes ? result?.nodes : [];
      this.diagramLinkData = result?.edges ? result?.edges : [];
    }, error => {
      console.error(error)
    })
  }


}

