// supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// *** SUBSTITUA COM SUAS CREDENCIAIS REAIS ***
const supabaseUrl = 'https://ajyohlwzdvkdgbjsgewz.supabase.co'; // Sua URL
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqeW9obHd6ZHZrZGdianNnZXd6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxOTA3MTAsImV4cCI6MjA2MTc2NjcxMH0.RaM7tb81_dk30JW9vTiMuTiKD9ze62-EKRBoMpEh7sA'; // Sua Chave Anon

let supabaseInstance = null;

try {
    // Verifica se as constantes foram preenchidas (não compara com placeholders agora)
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('SUA_URL') || supabaseAnonKey.includes('SUA_CHAVE')) {
        throw new Error("Supabase URL ou Anon Key não configuradas corretamente em supabaseClient.js!");
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    console.log("Supabase client inicializado com sucesso.");
} catch (error) {
    console.error("ERRO CRÍTICO ao criar o cliente Supabase:", error);
    alert("Falha ao inicializar a conexão com o banco de dados. Verifique o console e supabaseClient.js");
    supabaseInstance = null;
}

export const supabase = supabaseInstance;