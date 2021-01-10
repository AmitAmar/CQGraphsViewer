import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {ApiGraph, Quantity} from "./types";
import {Observable, of} from "rxjs";

@Injectable({providedIn: 'root'})
export class ApiService {


  private readonly url = 'http://localhost:8080';
  private readonly graphUrl = `${this.url}/get-graph`;
  private readonly quantitiesUrl = `${this.url}/get-quantities`;
  private readonly tableUrl = `${this.url}/get-table`;
  private readonly arrangedByUrl = `${this.url}/arranged-by`;
  private readonly plotUrl = `${this.url}/plot`;


  constructor(private http: HttpClient) {
  }

  getGraph = () => this.http.get<ApiGraph>(this.graphUrl)

  getQuantities(): Observable<Quantity[]> {
    return this.http.get<Quantity[]>(this.quantitiesUrl);
  }

  getTableData(): Observable<{[key: string]:string}[]> {
    return this.http.get<{[key: string]:string}[]>(this.tableUrl);
  }

  postArrange(name: string) {
    return this.http.post(`${this.arrangedByUrl}/${name}`, {});
  }

  postPlot(name: string) {
    return this.http.post(`${this.plotUrl}/${name}`, {});
  }
}
