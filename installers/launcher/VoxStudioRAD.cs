using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

namespace VoxStudioRAD
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string appDir = AppDomain.CurrentDomain.BaseDirectory;
                string serverScript = Path.Combine(appDir, "tools", "vox-rad", "server.js");
                string nodePath = "node";

                // Se houver arquivo .voxProj passado via linha de comando (duplo clique)
                string projectArg = "";
                if (args.Length > 0 && File.Exists(args[0]))
                {
                    projectArg = "?projectFile=" + Uri.EscapeDataString(Path.GetFullPath(args[0]));
                }

                // Verificar se o servidor já está rodando na porta 4500
                bool isRunning = false;
                try
                {
                    HttpWebRequest request = (HttpWebRequest)WebRequest.Create("http://localhost:4500/api/status");
                    request.Timeout = 1000;
                    using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                    {
                        if (response.StatusCode == HttpStatusCode.OK)
                            isRunning = true;
                    }
                }
                catch { }

                // Se não estiver rodando, iniciar o processo Node em segundo plano sem janela preta
                if (!isRunning && File.Exists(serverScript))
                {
                    ProcessStartInfo psi = new ProcessStartInfo();
                    psi.FileName = nodePath;
                    psi.Arguments = "\"" + serverScript + "\"";
                    psi.WorkingDirectory = appDir;
                    psi.WindowStyle = ProcessWindowStyle.Hidden;
                    psi.CreateNoWindow = true;
                    psi.UseShellExecute = false;
                    Process.Start(psi);

                    // Aguardar brevemente para inicialização do servidor HTTP
                    Thread.Sleep(1200);
                }

                // Abrir o navegador padrão no Vox Studio RAD
                string url = "http://localhost:4500" + projectArg;
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao iniciar Vox Studio RAD: " + ex.Message, "Vox Studio RAD", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
