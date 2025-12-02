"use client";

import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { Id } from "../convex/_generated/dataModel";

type FileType = {
  _id: Id<"files">;
  _creationTime: number;
  fileName: string;
  fileType: string;
  mimeType: string;
  url?: string;
};

export default function Home() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md p-4 border-b border-slate-200 dark:border-slate-700 flex flex-row justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <Image src="/convex.svg" alt="Convex Logo" width={32} height={32} />
            <div className="w-px h-8 bg-slate-300 dark:bg-slate-600"></div>
            <Image
              src="/nextjs-icon-light-background.svg"
              alt="Next.js Logo"
              width={32}
              height={32}
              className="dark:hidden"
            />
            <Image
              src="/nextjs-icon-dark-background.svg"
              alt="Next.js Logo"
              width={32}
              height={32}
              className="hidden dark:block"
            />
          </div>
          <h1 className="font-semibold text-slate-800 dark:text-slate-200">
            File Uploader
          </h1>
        </div>
        <SignOutButton />
      </header>
      <main className="p-8 flex flex-col gap-8">
        <Content />
      </main>
    </>
  );
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  return (
    <>
      {isAuthenticated && (
        <button
          className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          onClick={() =>
            void signOut().then(() => {
              router.push("/signin");
            })
          }
        >
          Sign out
        </button>
      )}
    </>
  );
}

function Content() {
  const files = useQuery(api.myFunctions.listFiles) ?? [];
  const generateUploadUrl = useMutation(api.myFunctions.generateUploadUrl);
  const saveFileMetadata = useMutation(api.myFunctions.saveFileMetadata);
  const deleteFile = useMutation(api.myFunctions.deleteFile);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";
    return "unknown";
  };

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = event.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;

      setUploading(true);
      try {
        for (const file of Array.from(selectedFiles)) {
          // Check if file is image, video, or audio
          const fileType = getFileType(file.type);
          if (fileType === "unknown") {
            alert(`${file.name} is not a supported file type. Please upload images, videos, or audio files.`);
            continue;
          }

          // Generate upload URL
          const uploadUrl = await generateUploadUrl();

          // Upload file to Convex storage
          const result = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!result.ok) {
            throw new Error(`Upload failed: ${result.statusText}`);
          }

          const response = await result.json();
          const storageId = response.storageId;

          if (!storageId) {
            throw new Error("No storageId in response");
          }

          // Save file metadata
          await saveFileMetadata({
            storageId,
            fileName: file.name,
            fileType,
            mimeType: file.type,
          });
        }
      } catch (error) {
        console.error("Error uploading file:", error);
        alert(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`);
      } finally {
        setUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [generateUploadUrl, saveFileMetadata]
  );

  const handleDelete = useCallback(
    async (fileId: Id<"files">) => {
      if (!confirm("Are you sure you want to delete this file?")) return;
      try {
        await deleteFile({ fileId });
      } catch (error) {
        console.error("Error deleting file:", error);
        alert("Failed to delete file. Please try again.");
      }
    },
    [deleteFile]
  );

  if (files === undefined) {
    return (
      <div className="mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-slate-600 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
          <p className="ml-2 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full">
      {/* File Upload Section */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-2xl text-slate-800 dark:text-slate-200">
          Upload Files
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Upload images, videos, or audio files. Files are stored securely in
          Convex storage.
        </p>
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
            disabled={uploading}
          />
          <label
            htmlFor="file-upload"
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer ${
              uploading
                ? "bg-slate-400 dark:bg-slate-600 cursor-not-allowed"
                : "bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 text-white hover:scale-[1.02] active:scale-[0.98]"
            }`}
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Uploading...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Choose Files
              </>
            )}
          </label>
        </div>
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-700"></div>

      {/* Files Grid */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-2xl text-slate-800 dark:text-slate-200">
          Your Files ({files.length})
        </h2>
        {files.length === 0 ? (
          <div className="text-center py-12 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl">
            <p className="text-slate-600 dark:text-slate-400">
              No files uploaded yet. Upload your first file above!
            </p>
          </div>
        ) : (
          <MasonryGrid files={files} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}

function MasonryGrid({
  files,
  onDelete,
}: {
  files: FileType[];
  onDelete: (fileId: Id<"files">) => void;
}) {
  return (
    <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
      {files.map((file) => (
        <FileCard key={file._id} file={file} onDelete={onDelete} />
      ))}
    </div>
  );
}

function FileCard({
  file,
  onDelete,
}: {
  file: FileType;
  onDelete: (fileId: Id<"files">) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="break-inside-avoid mb-4 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600 shadow-sm hover:shadow-xl transition-all duration-200 relative group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {file.url && (
        <>
          {file.fileType === "image" && (
            <div className="relative w-full bg-slate-200 dark:bg-slate-700">
              <img
                src={file.url}
                alt={file.fileName}
                className="w-full h-auto object-cover"
                loading="lazy"
              />
            </div>
          )}
          {file.fileType === "video" && (
            <div className="relative w-full bg-slate-200 dark:bg-slate-700">
              <video
                src={file.url}
                controls
                className="w-full h-auto max-h-96"
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          {file.fileType === "audio" && (
            <div className="p-4 bg-slate-200 dark:bg-slate-700">
              <div className="flex items-center justify-center gap-3 mb-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-slate-600 dark:text-slate-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.383 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.383l4-3.617a1 1 0 011.617.793zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <audio src={file.url} controls className="w-full">
                Your browser does not support the audio tag.
              </audio>
            </div>
          )}
        </>
      )}
      <div className="p-3">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate" title={file.fileName}>
          {file.fileName}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {file.fileType.charAt(0).toUpperCase() + file.fileType.slice(1)} • {new Date(file._creationTime).toLocaleDateString()}
        </p>
      </div>
      {isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(file._id);
          }}
          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110 z-10"
          title="Delete file"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
