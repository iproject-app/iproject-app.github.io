export interface Project {
  slug: string;
  name: string;
  expenseCount: number;
  total: number;
}

export interface ProjectListResponse {
  projects: Project[];
}
