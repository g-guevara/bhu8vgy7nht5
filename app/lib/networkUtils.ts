// app/utils/networkUtils.ts
export const getErrorMessage = (error: any): string => {
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      return 'No hay conexión a internet';
    }
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return 'Error de conexión';
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      return 'Tiempo de espera agotado';
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    return 'Ha ocurrido un error inesperado';
  };
  
  export const isNetworkError = (error: any): boolean => {
    if (!error) return false;
    
    return (
      (error instanceof TypeError && error.message.includes('Network request failed')) ||
      (error instanceof TypeError && error.message.includes('Failed to fetch')) ||
      (error instanceof Error && error.name === 'AbortError')
    );
  };