import { Address } from './Address';
import { InventoryItem } from './InventoryItem';

export interface Warehouse {
  id: string;
  name: string;
  address: Address;
  inventory: InventoryItem[];
}