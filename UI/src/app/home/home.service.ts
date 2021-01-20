import {HttpClient} from "@angular/common/http";
import {Injectable} from "@angular/core";
import {ApiGraph, Quantity} from "../types";
import {Observable} from "rxjs";

@Injectable({providedIn: 'root'})
export class HomeService {
  private readonly url = 'http://localhost:8080';
  private readonly graphUrl = `${this.url}/get-graph`;
  private readonly quantitiesUrl = `${this.url}/get-quantities`;
  private readonly quantitiesOptionsUrl = `${this.url}/get-quantities-options`;
  private readonly tableUrl = `${this.url}/get-table`;
  private readonly arrangedByUrl = `${this.url}/arranged-by`;
  private readonly setSpecificMagnitudeUrl = `${this.url}/set-specific-magnitude`;


  constructor(private http: HttpClient) {
  }

  getGraph = () => this.http.get<ApiGraph>(this.graphUrl)

  getQuantities(): Observable<Quantity[]> {
    return this.http.get<Quantity[]>(this.quantitiesUrl);
  }

  getQuantitiesOptions(): Observable<{[key: string]:string}[]> {
    return this.http.get<{[key: string]:string}[]>(this.quantitiesOptionsUrl);
  }

  getTableData(): Observable<{[key: string]:string}[]> {
    return this.http.get<{[key: string]:string}[]>(this.tableUrl);
  }

  postArrange(name: string) {
    return this.http.post(`${this.arrangedByUrl}/${name}`, {});
  }

  setSpecificMagnitude(name: string) {
    return this.http.post(`${this.setSpecificMagnitudeUrl}/${name}`, {});
  }
}
