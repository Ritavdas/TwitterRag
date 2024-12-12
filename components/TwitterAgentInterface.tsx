"use client";
import React, { useState, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDropzone } from "react-dropzone";

interface AnalysisResult {
  tweetText: string;
  refinedQuery: string;
  analysis: string;
}

export default function TweetAnalyzer() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Handle image files
  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      console.error("Please upload an image file");
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      console.error("File size should be less than 5MB");
      return;
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
  }, []);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles?.[0]) {
        handleImageFile(acceptedFiles[0]);
      }
    },
  });

  const handleRemoveFile = useCallback(() => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setSelectedFile(null);
    setFilePreview("");
    setAnalysisResult(null);
  }, [filePreview]);

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    try {
      setIsAnalyzing(true);
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("/api/twitter/tweet-analysis", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze tweet");
      }

      const data = await response.json();
      setAnalysisResult(data);
      
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-6 h-6" />
            Tweet Research Agent
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* File Upload Area */}
          <div
            {...getRootProps()}
            className={\`border-2 border-dashed rounded-lg p-6 transition-colors
              \${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}
              \${selectedFile ? "bg-gray-50" : ""}\`}
          >
            <input {...getInputProps()} />
            {!selectedFile ? (
              <div className="text-center">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-gray-900">
                  Drop a tweet screenshot here, or paste from clipboard
                </p>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={filePreview}
                  alt="Tweet preview"
                  className="max-h-96 mx-auto rounded-lg"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Analysis Button */}
          {selectedFile && !isAnalyzing && (
            <button
              onClick={handleAnalyze}
              className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg"
            >
              <Upload className="h-5 w-5 inline mr-2" />
              Analyze Tweet
            </button>
          )}

          {/* Loading State */}
          {isAnalyzing && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 inline mr-2" />
              Analyzing tweet...
            </div>
          )}

          {/* Analysis Result */}
          {analysisResult && (
            <div className="mt-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Extracted Text:</h3>
                <p>{analysisResult.tweetText}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Search Query:</h3>
                <code className="block bg-blue-100 p-2 rounded">
                  {analysisResult.refinedQuery}
                </code>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Analysis:</h3>
                <p className="whitespace-pre-wrap">{analysisResult.analysis}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}