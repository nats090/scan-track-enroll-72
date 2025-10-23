
import { supabase } from '@/integrations/supabase/client';
import { saveToLocalStorage, getFromLocalStorage } from '@/utils/offlineStorage';

export interface DocumentLink {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  education_level: string;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  uploaded_at?: string;
}

export const documentService = {
  async getDocuments(): Promise<DocumentLink[]> {
    try {
      const { data, error } = await supabase
        .from('document_links')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        // Try to load from offline storage if online fetch fails
        const offlineData = await getFromLocalStorage();
        return offlineData.documents || [];
      }

      const documents = data?.map(doc => ({
        ...doc,
        education_level: doc.education_level || 'general'
      })) || [];

      // Save to offline storage for future use
      await saveToLocalStorage({ documents });

      return documents;
    } catch (error) {
      console.error('Error in getDocuments:', error);
      // Fallback to offline storage
      const offlineData = await getFromLocalStorage();
      return offlineData.documents || [];
    }
  },

  async addDocument(document: Omit<DocumentLink, 'id' | 'created_at' | 'updated_at'>): Promise<DocumentLink> {
    try {
      const { data, error } = await supabase
        .from('document_links')
        .insert({
          ...document,
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding document:', error);
        throw error;
      }

      const newDoc = {
        ...data,
        education_level: data.education_level || 'general'
      };

      // Update offline storage
      const offlineData = await getFromLocalStorage();
      const updatedDocuments = [...(offlineData.documents || []), newDoc];
      await saveToLocalStorage({ documents: updatedDocuments });

      return newDoc;
    } catch (error) {
      console.error('Error in addDocument:', error);
      throw error;
    }
  },

  async updateDocument(id: string, updates: Partial<Omit<DocumentLink, 'id' | 'created_at' | 'updated_at'>>): Promise<DocumentLink> {
    try {
      const { data, error } = await supabase
        .from('document_links')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating document:', error);
        throw error;
      }

      const updatedDoc = {
        ...data,
        education_level: data.education_level || 'general'
      };

      // Update offline storage
      const offlineData = await getFromLocalStorage();
      const updatedDocuments = (offlineData.documents || []).map(doc =>
        doc.id === id ? updatedDoc : doc
      );
      await saveToLocalStorage({ documents: updatedDocuments });

      return updatedDoc;
    } catch (error) {
      console.error('Error in updateDocument:', error);
      throw error;
    }
  },

  async deleteDocument(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('document_links')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting document:', error);
        throw error;
      }

      // Update offline storage
      const offlineData = await getFromLocalStorage();
      const updatedDocuments = (offlineData.documents || []).filter(doc => doc.id !== id);
      await saveToLocalStorage({ documents: updatedDocuments });
    } catch (error) {
      console.error('Error in deleteDocument:', error);
      throw error;
    }
  },

  async searchDocuments(searchTerm: string, educationLevel?: string): Promise<DocumentLink[]> {
    try {
      let query = supabase
        .from('document_links')
        .select('*');

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,uploaded_by.ilike.%${searchTerm}%`);
      }

      if (educationLevel && educationLevel !== 'all') {
        query = query.eq('education_level', educationLevel);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Error searching documents:', error);
        // Try to search in offline storage
        const offlineData = await getFromLocalStorage();
        const docs = offlineData.documents || [];
        return docs.filter((doc: any) => {
          const matchesSearch = !searchTerm || 
            doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.uploaded_by?.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesLevel = !educationLevel || educationLevel === 'all' || doc.education_level === educationLevel;
          return matchesSearch && matchesLevel;
        });
      }

      return data?.map(doc => ({
        ...doc,
        education_level: doc.education_level || 'general'
      })) || [];
    } catch (error) {
      console.error('Error in searchDocuments:', error);
      return [];
    }
  }
};
