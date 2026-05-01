import path from 'path';

export function isPathWithin(parent: string, child: string): boolean {
    const resolvedParent = path.resolve(parent);
    const resolvedChild = path.resolve(child);
    return resolvedChild.startsWith(resolvedParent + path.sep);
}