namespace ReleaseModule.Models.Response
{
    public class ExpResponse<T>
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public T Data { get; set; }
    }
}
