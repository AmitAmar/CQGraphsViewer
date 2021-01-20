import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {ApiGraph} from "../types";

@Injectable({providedIn: 'root'})
export class PlotBService {
  private readonly url = 'http://localhost:8080';
  private readonly graphUrl = `${this.url}/get-plot-b-graph`;


  constructor(private http: HttpClient) {
  }

  getGraph = () => this.http.get<ApiGraph>(this.graphUrl)
}
