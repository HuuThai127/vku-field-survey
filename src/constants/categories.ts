import type { InspectionCategory } from '../types/inspection';

export interface CategoryMetadata {
  id: InspectionCategory;
  name: string;
  icon: string; // SVG icon or emoji
  description: string;
  checklist: string[];
}

export const CATEGORIES: CategoryMetadata[] = [
  {
    id: 'Hardware',
    name: 'Hardware & IT',
    icon: '💻',
    description: 'Lab PCs, keyboards, mice, monitors, audio headsets',
    checklist: ['PC boots properly', 'Peripherals responsive', 'Display cables intact']
  },
  {
    id: 'Projector',
    name: 'Projector & Screens',
    icon: '📽️',
    description: 'Classroom projectors, motorized projection screens, HDMI/VGA ports',
    checklist: ['Lamp brightness adequate', 'Keystone adjusted', 'Remote & control box working']
  },
  {
    id: 'AC',
    name: 'Air Conditioning',
    icon: '❄️',
    description: 'Split units, central AC panels, remote sensors, ventilation fans',
    checklist: ['Cooling efficiency', 'Drainage pipe leak-free', 'Remote controller responsive']
  },
  {
    id: 'Electrical',
    name: 'Electrical & Lighting',
    icon: '⚡',
    description: 'Fluorescent/LED ceiling tubes, power outlets, circuit breakers',
    checklist: ['Wall sockets firmly seated', 'Switches operating safely', 'No exposed wiring']
  },
  {
    id: 'Furniture',
    name: 'Furniture & Fixtures',
    icon: '🪑',
    description: 'Student desks, teacher podiums, swivel chairs, whiteboards, door locks',
    checklist: ['Desk surface stable', 'Whiteboard surface clean', 'Door latch & window hinges secure']
  }
];
