import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {ApiGraph} from "./types";

@Injectable({providedIn: 'root'})
export class ApiService {

  private readonly URLGraph = 'http://localhost:8080/get-graph'; // todo

  constructor(private http: HttpClient) {
  }

  getNodeAndEdge = () => this.http.get<ApiGraph>(this.URLGraph)
}
