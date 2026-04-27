import { mixed, object, string } from "yup";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const uploadSchema = object({
  file: mixed<File>()
    .required("File is required")
    .test("fileType", "Invalid file", (value) => {
      return value instanceof File;
    })
    .test("fileSize", "File is empty", (value) => {
      if (!value) return false;
      return value.size > 0;
    })
    .test("fileMaxSize", "File size exceeds 5MB", (value) => {
      if (!value) return false;
      return value.size <= MAX_FILE_SIZE;
    }),

  file_name: string().optional(),
});
