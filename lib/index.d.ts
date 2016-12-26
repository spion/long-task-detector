export interface Report {
    taskLength: number;
    items: ReportItem[];
}
export interface ReportItem {
    cpu: number;
    stackTrace: StackItem[];
}
export interface StackItem {
    name: string;
    line: number;
    url: string;
}
export declare function createDetector(notifyMe: (report: Report) => void, maxDelta: number): () => void;
