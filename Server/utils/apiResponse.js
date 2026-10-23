
export const sendSuccess = (
  res,
  data = null,
  message = "Success",
  status = 200
) => {
  return res.status(status).json({
    success: true,
    message,
    data: data ?? null,
  });
};

export const sendError = (
  res,
  message = "Something went wrong",
  status = 400
) => {
  return res.status(status).json({
    success: false,
    message,
  });
};
