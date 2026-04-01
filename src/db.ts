import Dexie, { type Table } from 'dexie';
import { UserProfile, SavedRoute } from './types';

export class RouteMasterDB extends Dexie {
  profiles!: Table<UserProfile>;
  routes!: Table<SavedRoute>;

  constructor() {
    super('RouteMaster_Local');
    this.version(4).stores({
      profiles: '++id, name, persona',
      routes: '++id, profileId, route_id, display_name, trip_date, created_at'
    });
  }
}

export const db = new RouteMasterDB();
