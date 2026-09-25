export interface BuildingInfo {
  id: string;
  name: string;
  code: string;
  description: string;
  floors: string[];
  suggestedRooms: string[];
}

export const BUILDINGS: BuildingInfo[] = [
  {
    id: 'bldg-a',
    name: 'Building A — Main Lecture Hall',
    code: 'A',
    description: 'Central campus lecture auditoriums and administrative offices',
    floors: ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4'],
    suggestedRooms: ['A1-101', 'A1-201', 'A1-203', 'A1-305', 'A1-402']
  },
  {
    id: 'bldg-b',
    name: 'Building B — Software & IT Labs',
    code: 'B',
    description: 'Computer science labs, server infrastructure, IoT testbeds',
    floors: ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4', 'Floor 5'],
    suggestedRooms: ['B2-101', 'B2-204', 'B2-302', 'B2-405', 'B2-501']
  },
  {
    id: 'bldg-c',
    name: 'Building C — Digital Economy & Innovation',
    code: 'C',
    description: 'Business simulation rooms, multi-media studios, classrooms',
    floors: ['Floor 1', 'Floor 2', 'Floor 3', 'Floor 4'],
    suggestedRooms: ['C1-102', 'C1-203', 'C1-304', 'C1-401']
  },
  {
    id: 'bldg-d',
    name: 'Building D — Learning Resource Center & Library',
    code: 'D',
    description: 'Quiet study halls, seminar rooms, digital resource terminals',
    floors: ['Floor 1', 'Floor 2', 'Floor 3'],
    suggestedRooms: ['D2-102', 'D2-201', 'D2-301']
  },
  {
    id: 'bldg-k',
    name: 'Building K — Engineering Complex',
    code: 'K',
    description: 'Robotics labs, hardware prototyping, automation suites',
    floors: ['Floor 1', 'Floor 2', 'Floor 3'],
    suggestedRooms: ['K1-101', 'K1-202', 'K1-303']
  }
];
