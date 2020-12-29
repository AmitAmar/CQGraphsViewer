import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {ApiGraph, Quantity} from "./types";
import {Observable, of} from "rxjs";

@Injectable({providedIn: 'root'})
export class ApiService {


  private readonly url = 'http://localhost:8080';
  private readonly graphUrl = `${this.url}/get-graph`;
  private readonly quantitiesUrl = `${this.url}/get-quantities`;
  private readonly arrangedByUrl = `${this.url}/arranged-by`;


  constructor(private http: HttpClient) {
  }

  getNodeAndEdge = () => this.http.get<ApiGraph>(this.graphUrl)

  getQuantities(): Observable<Quantity[]> {
    return this.http.get<Quantity[]>(this.quantitiesUrl);
    //return of([{name: 'Amit'}, {name: 'Mochai'}, {name: 'Oren'}, {name: 'Dima'}]);
  }

  postArrange(name: string) {
    return this.http.post(`${this.arrangedByUrl}/${name}`, {});
  }
}
