using System.Security.Cryptography;
using System.Text;

namespace Release_Module.Services
{
    public class PasswordHasher
    {
        private const string _securityKey = "raju";

        public string GetEdataHex(string username, string password)
        {
            using (MD5 md5Hasher = MD5.Create())
            {
                UTF8Encoding encoder = new UTF8Encoding();
                byte[] hashedDataBytes = md5Hasher.ComputeHash(
                    encoder.GetBytes(username + _securityKey + password));

                StringBuilder sb = new StringBuilder();
                foreach (byte b in hashedDataBytes)
                {
                    sb.Append(b.ToString("X2")); // uppercase hex
                }
                return sb.ToString();
            }
        }
    }
}
