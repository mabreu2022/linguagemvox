using System;
using System.Diagnostics;
using System.IO;

namespace VoxCli
{
    class Program
    {
        static int Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string scriptPath = Path.Combine(baseDir, "dist", "cli", "index.js");
                if (!File.Exists(scriptPath))
                {
                    scriptPath = Path.Combine(baseDir, "..", "dist", "cli", "index.js");
                }
                if (!File.Exists(scriptPath))
                {
                    scriptPath = Path.Combine(baseDir, "..", "..", "dist", "cli", "index.js");
                }

                if (!File.Exists(scriptPath))
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.Error.WriteLine("Erro: Compilador Vox não encontrado em: " + scriptPath);
                    Console.ResetColor();
                    return 1;
                }

                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = "node";
                
                string combinedArgs = "\"" + scriptPath + "\"";
                foreach (string arg in args)
                {
                    if (arg.Contains(" ") || arg.Contains("\""))
                        combinedArgs += " \"" + arg.Replace("\"", "\\\"") + "\"";
                    else
                        combinedArgs += " " + arg;
                }

                psi.Arguments = combinedArgs;
                psi.UseShellExecute = false;

                using (Process proc = Process.Start(psi))
                {
                    proc.WaitForExit();
                    return proc.ExitCode;
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.Error.WriteLine("Erro ao executar Vox CLI: " + ex.Message);
                Console.ResetColor();
                return 1;
            }
        }
    }
}
