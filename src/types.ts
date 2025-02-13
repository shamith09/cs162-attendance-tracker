import { RowDataPacket } from "mysql2";

export interface RosterStudent extends RowDataPacket {
  id: string;
  name: string;
  email: string;
  added_at: string;
}
