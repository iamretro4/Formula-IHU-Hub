import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UploadFile } from '@/integrations/Core';
import { Document } from '@/entities/Document';

const documentTypes = [
  { value: 'engineering_design_report', label: 'Engineering Design Report' },
  { value: 'bom', label: 'Bill of Materials (BOM)' },
  { value: 'cost_report', label: 'Cost Report' },
  { value: 'business_plan', label: 'Business Plan Presentation' },
  { value: 'technical_drawings', label: 'Technical Drawings' },
  { value: 'other', label: 'Other Document' }
];

export default function FileUpload({ teamId, userId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [error, setError] = useState('');
  const [documents, setDocuments] = useState([]);

  const loadDocuments = useCallback(async () => {
    if (!teamId) return;
    try {
      const teamDocuments = await Document.filter({ team_id: teamId }, '-upload_date');
      setDocuments(teamDocuments);
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  }, [teamId]);

  React.useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentType) {
      setError('Please select a file and document type');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Upload file using integration
      const { file_url } = await UploadFile({ file: selectedFile });

      // Create document record
      const documentData = {
        team_id: teamId,
        document_type: documentType,
        file_name: selectedFile.name,
        file_url: file_url,
        file_size: selectedFile.size,
        uploaded_by: userId,
        upload_date: new Date().toISOString(),
        status: 'pending_review',
        version: 1
      };

      await Document.create(documentData);
      
      // Reset form
      setSelectedFile(null);
      setDocumentType('');
      document.getElementById('file-input').value = '';
      
      // Reload documents
      await loadDocuments();
      
      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (error) {
      console.error('Upload failed:', error);
      setError('Upload failed. Please try again.');
    }
    setUploading(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      case 'revision_required': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'revision_required': return 'bg-orange-100 text-orange-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="document-type">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-input">Choose File</Label>
            <Input
              id="file-input"
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={handleFileChange}
            />
            <p className="text-xs text-gray-500">
              Supported formats: PDF, Word, Excel, PowerPoint. Max size: 50MB
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || !documentType}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium">{doc.file_name}</p>
                      <p className="text-sm text-gray-600">
                        {documentTypes.find(t => t.value === doc.document_type)?.label}
                      </p>
                      <p className="text-xs text-gray-500">
                        Uploaded {new Date(doc.upload_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(doc.status)}
                    <Badge className={getStatusColor(doc.status)}>
                      {doc.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}