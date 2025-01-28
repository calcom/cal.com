export const fetchDataOrRedirect = async (formId: string, searchParams: URLSearchParams) => {
  const baseUrl = import.meta.env.VITE_BOOKER_EMBED_API_URL;
  const response = await fetch(`${baseUrl}/router/forms/${formId}?${searchParams.toString()}`, {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }

  const data = await response.json();
  return { data };
};
