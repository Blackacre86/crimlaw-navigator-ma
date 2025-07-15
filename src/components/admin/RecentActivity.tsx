import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Eye, Clock, User, MessageSquare } from 'lucide-react';

interface RecentActivityProps {
  recentActivity: Array<{
    id: string;
    userId: string;
    query: string;
    confidence: number;
    createdAt: string;
    responseTime: number;
    answer: string;
  }>;
}

export function RecentActivity({ recentActivity }: RecentActivityProps) {
  const [selectedQuery, setSelectedQuery] = useState<any>(null);

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge variant="outline" className="text-success border-success">High</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge variant="outline" className="text-warning border-warning">Medium</Badge>;
    } else {
      return <Badge variant="outline" className="text-destructive border-destructive">Low</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const formatResponseTime = (ms: number) => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Recent Query Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Query</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivity.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{activity.userId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <p className="text-sm truncate">{activity.query}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getConfidenceBadge(activity.confidence)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{formatResponseTime(activity.responseTime)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(activity.createdAt)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedQuery(activity)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Query Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground mb-2">Query</h4>
                            <p className="text-sm">{selectedQuery?.query}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm text-muted-foreground mb-2">Response</h4>
                            <p className="text-sm bg-secondary/50 p-3 rounded-lg">
                              {selectedQuery?.answer}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-1">Confidence</h4>
                              <p className="text-sm">{((selectedQuery?.confidence || 0) * 100).toFixed(1)}%</p>
                            </div>
                            <div>
                              <h4 className="font-medium text-sm text-muted-foreground mb-1">Response Time</h4>
                              <p className="text-sm">{formatResponseTime(selectedQuery?.responseTime || 0)}</p>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}